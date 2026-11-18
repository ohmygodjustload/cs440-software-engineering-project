using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
namespace AppointmentScheduler.Api.Stores;

public sealed class AccountModeException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

/// <summary>Self-service capability additions and admin review, on the same account.</summary>
public sealed class AccountModeWorkflow(IUserStore users, IProviderRequestStore requests,
    IServiceProvider services, IOptions<MongoDbSettings> options)
{
    private static readonly object Gate = new();
    private MongoDbContext? Context => services.GetService<MongoDbContext>();
    private static AccountModeException Fail(int status, string message) => new(status, message);

    public AccountModeStatus Status(string userId)
    {
        var user = RequireUser(users.GetById(userId));
        var latest = requests.GetLatestByUserId(userId);
        var status = latest is null ? null : new ProviderApplicationStatus(latest.Id,
            !latest.IsReviewed ? "pending" : latest.IsApproved ? "approved" : "rejected",
            latest.Notes, latest.SubmittedAt);
        return new(user, status);
    }

    public User EnableClient(string userId) => Execute(userId, user =>
    {
        CheckProvider(user);
        if (user.IsClient) return user;
        var copy = Copy(user);
        copy.IsClient = true;
        if (!users.Update(copy)) throw Fail(409, "Your account changed. Refresh and retry.");
        return copy;
    }, (session, user, context) =>
    {
        CheckProvider(user);
        context.Database.GetCollection<BsonDocument>(options.Value.UsersCollection)
            .UpdateOne(session, ById(user.Id), Builders<BsonDocument>.Update.Set("IsClient", true));
        user.IsClient = true;
        return user;
    });

    public ProviderRequest Apply(string userId, AddProviderRoleRequest dto)
    {
        if (dto.ServiceTypes is null || dto.ServiceTypes.Count == 0 || dto.ServiceTypes.Count > 3 ||
            dto.ServiceTypes.Any(category => !Enum.IsDefined(category)))
            throw Fail(400, "Select at least one valid service category.");
        if (new[] { dto.MedicalCredentials?.Info, dto.BeautyCredentials?.Info, dto.FitnessCredentials?.Info }
            .Any(info => info?.Length > 500)) throw Fail(400, "Qualifications must be 500 characters or fewer.");
        return Execute(userId, user =>
        {
            CheckApplicant(user);
            if (requests.GetAll().Any(request => request.UserId == user.Id && !request.IsReviewed))
                throw Fail(409, "Your provider application is already awaiting review.");
            return requests.Add(Application(user, dto));
        }, (session, user, context) =>
        {
            CheckApplicant(user);
            var collection = context.Database.GetCollection<BsonDocument>(options.Value.ProviderRequestsCollection);
            var pending = Reference("UserId", user.Id) & Builders<BsonDocument>.Filter.Ne("IsDeleted", true)
                & Builders<BsonDocument>.Filter.Ne("IsReviewed", true);
            if (collection.Find(session, pending).Any())
                throw Fail(409, "Your provider application is already awaiting review.");
            var request = Application(user, dto);
            var document = MongoProviderRequestStore.ToDocument(request);
            var id = ObjectId.GenerateNewId();
            document["_id"] = id;
            request.Id = id.ToString();
            collection.InsertOne(session, document);
            return request;
        });
    }

    public ProviderRequest Review(string requestId, bool approved, string? notes)
    {
        var initial = requests.GetById(requestId) ?? throw Fail(404, "Provider request not found.");
        return Execute(initial.UserId, user =>
        {
            var current = requests.GetById(requestId) ?? throw Fail(404, "Provider request not found.");
            EnsureOpen(current);
            var review = Reviewed(current, approved, notes);
            if (approved && !users.Update(ApprovedUser(user, current)))
                throw Fail(409, "The account changed. Refresh and retry.");
            if (!requests.Update(review)) throw Fail(409, "The application changed. Refresh and retry.");
            return review;
        }, (session, user, context) =>
        {
            var collection = context.Database.GetCollection<BsonDocument>(options.Value.ProviderRequestsCollection);
            var raw = collection.Find(session, ById(requestId) & Builders<BsonDocument>.Filter.Ne("IsDeleted", true)).FirstOrDefault()
                ?? throw Fail(404, "Provider request not found.");
            var current = MongoProviderRequestStore.Map(raw);
            EnsureOpen(current);
            if (current.UserId != user.Id) throw Fail(409, "The application owner changed. Refresh and retry.");
            var review = Reviewed(current, approved, notes);
            if (approved)
            {
                var updated = ApprovedUser(user, current);
                var changes = Builders<BsonDocument>.Update.Set("IsActive", true).Set("IsServiceProvider", true)
                    .Set("ServiceTypes", new BsonArray(updated.ServiceTypes.Select(category => category.ToString())))
                    .Set("MedicalCredentials", Credential(updated.MedicalCredentials))
                    .Set("BeautyCredentials", Credential(updated.BeautyCredentials))
                    .Set("FitnessCredentials", Credential(updated.FitnessCredentials));
                context.Database.GetCollection<BsonDocument>(options.Value.UsersCollection).UpdateOne(session, ById(user.Id), changes);
            }
            var document = MongoProviderRequestStore.ToDocument(review);
            document["_id"] = raw["_id"];
            collection.ReplaceOne(session, Builders<BsonDocument>.Filter.Eq("_id", raw["_id"]), document);
            return review;
        }, allowInactive: true);
    }

    private T Execute<T>(string userId, Func<User, T> memory,
        Func<IClientSessionHandle, User, MongoDbContext, T> mongo, bool allowInactive = false)
    {
        var context = Context;
        if (context is null)
        {
            lock (Gate) return memory(RequireUser(users.GetById(userId), allowInactive));
        }
        using var session = context.Client.StartSession();
        return session.WithTransaction((transaction, cancellation) =>
        {
            // Every new capability operation locks this account. Concurrent applications/reviews retry from a fresh snapshot.
            var raw = context.Database.GetCollection<BsonDocument>(options.Value.UsersCollection)
                .FindOneAndUpdate(transaction, ById(userId) & Builders<BsonDocument>.Filter.Ne("IsDeleted", true),
                    Builders<BsonDocument>.Update.Inc("AccountModeVersion", 1),
                    new FindOneAndUpdateOptions<BsonDocument> { ReturnDocument = ReturnDocument.After });
            return mongo(transaction, RequireUser(raw is null ? null : MongoUserStore.Map(raw), allowInactive), context);
        });
    }

    private static User RequireUser(User? user, bool allowInactive = false)
    {
        if (user is null) throw Fail(404, "Account not found.");
        if ((!allowInactive && !user.IsActive) || user.IsAdmin)
            throw Fail(403, "This account cannot change its account type.");
        return user;
    }
    private static void CheckProvider(User user)
    {
        if (!user.IsServiceProvider) throw Fail(403, "Only an approved provider can enable client booking here.");
    }
    private static void CheckApplicant(User user)
    {
        if (!user.IsClient || user.IsServiceProvider)
            throw Fail(409, "Your account cannot submit a new provider application.");
    }
    private static void EnsureOpen(ProviderRequest request)
    {
        if (request.IsReviewed) throw Fail(409, "This request has already been reviewed.");
    }
    private static ProviderRequest Application(User user, AddProviderRoleRequest dto) => new()
    {
        UserId = user.Id, ProviderName = $"{user.FirstName} {user.LastName}".Trim(),
        ServiceTypes = dto.ServiceTypes.Distinct().ToList(),
        MedicalCredentials = dto.ServiceTypes.Contains(AppointmentCategory.Medical) ? From(dto.MedicalCredentials) : null,
        BeautyCredentials = dto.ServiceTypes.Contains(AppointmentCategory.Beauty) ? From(dto.BeautyCredentials) : null,
        FitnessCredentials = dto.ServiceTypes.Contains(AppointmentCategory.Fitness) ? From(dto.FitnessCredentials) : null,
        SubmittedAt = DateTimeOffset.UtcNow
    };
    private static ServiceCredential? From(ServiceCredentialRequest? request) =>
        string.IsNullOrWhiteSpace(request?.Info) ? null : new() { Info = request.Info.Trim() };
    private static BsonValue Credential(ServiceCredential? value) =>
        value is null ? BsonNull.Value : new BsonDocument("Info", BsonValue.Create(value.Info));
    private static ProviderRequest Reviewed(ProviderRequest current, bool approved, string? notes) => new()
    {
        Id = current.Id, UserId = current.UserId, ProviderName = current.ProviderName,
        ServiceTypes = [..current.ServiceTypes], MedicalCredentials = current.MedicalCredentials,
        BeautyCredentials = current.BeautyCredentials, FitnessCredentials = current.FitnessCredentials,
        SubmittedAt = current.SubmittedAt, IsReviewed = true, IsApproved = approved,
        Notes = notes?.Trim() ?? "", ReviewedAt = DateTimeOffset.UtcNow
    };
    private static User ApprovedUser(User user, ProviderRequest request)
    {
        var copy = Copy(user);
        copy.IsServiceProvider = true;
        copy.IsActive = true;
        copy.ServiceTypes = [..request.ServiceTypes];
        copy.MedicalCredentials = request.MedicalCredentials;
        copy.BeautyCredentials = request.BeautyCredentials;
        copy.FitnessCredentials = request.FitnessCredentials;
        return copy;
    }
    private static User Copy(User user) => new()
    {
        Id = user.Id, FirstName = user.FirstName, LastName = user.LastName, Username = user.Username,
        Email = user.Email, Phone = user.Phone, PasswordHash = user.PasswordHash,
        IsClient = user.IsClient, IsServiceProvider = user.IsServiceProvider, IsAdmin = user.IsAdmin,
        IsActive = user.IsActive, ServiceTypes = [..user.ServiceTypes],
        MedicalCredentials = user.MedicalCredentials, BeautyCredentials = user.BeautyCredentials,
        FitnessCredentials = user.FitnessCredentials
    };
    private static FilterDefinition<BsonDocument> ById(string id) => Reference("_id", id);
    private static FilterDefinition<BsonDocument> Reference(string field, string id) => ObjectId.TryParse(id, out var objectId)
        ? Builders<BsonDocument>.Filter.Eq(field, id) | Builders<BsonDocument>.Filter.Eq(field, objectId)
        : Builders<BsonDocument>.Filter.Eq(field, id);
}
