using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads and writes provider approval requests in the BAAAM.ProviderRequest collection
/// (see docs/DB_Cheatsheet.md). Reads always exclude soft-deleted documents.
/// </summary>
public sealed class MongoProviderRequestStore : IProviderRequestStore
{
    private readonly IMongoCollection<BsonDocument> _raw;

    public MongoProviderRequestStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _raw = context.Database.GetCollection<BsonDocument>(options.Value.ProviderRequestsCollection);
    }

    public IReadOnlyList<ProviderRequest> GetAll() =>
        _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Where(d => !IsDeleted(d))
            .Select(Map)
            .OrderByDescending(r => r.SubmittedAt)
            .ToList();

    public ProviderRequest? GetById(string id)
    {
        var doc = FindById(id);
        return doc is null || IsDeleted(doc) ? null : Map(doc);
    }

    public ProviderRequest? GetLatestByUserId(string userId) =>
        _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Where(d => !IsDeleted(d))
            .Select(Map)
            .Where(r => string.Equals(r.UserId, userId, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(r => r.SubmittedAt)
            .FirstOrDefault();

    public ProviderRequest Add(ProviderRequest request)
    {
        var doc = ToDocument(request);
        _raw.InsertOne(doc);
        request.Id = ReadId(doc, "_id") ?? request.Id;
        return request;
    }

    public bool Update(ProviderRequest request)
    {
        var id = request.Id;
        ObjectId? objectId = ObjectId.TryParse(id, out var parsed) ? parsed : null;

        var filter = objectId.HasValue
            ? Builders<BsonDocument>.Filter.Eq("_id", objectId.Value)
            : Builders<BsonDocument>.Filter.Eq("_id", id);

        // Replace the whole document; the id never changes.
        var replacement = ToDocument(request);
        replacement["_id"] = objectId.HasValue ? objectId.Value : BsonValue.Create(id);

        var result = _raw.ReplaceOne(filter, replacement);
        return result.MatchedCount > 0;
    }

    private BsonDocument? FindById(string id)
    {
        if (ObjectId.TryParse(id, out var oid))
        {
            var byOid = _raw.Find(Builders<BsonDocument>.Filter.Eq("_id", oid)).FirstOrDefault();
            if (byOid is not null)
            {
                return byOid;
            }
        }

        return _raw.Find(Builders<BsonDocument>.Filter.Eq("_id", id)).FirstOrDefault();
    }

    private static BsonDocument ToDocument(ProviderRequest request) => new()
    {
        ["UserId"] = request.UserId,
        ["ProviderName"] = request.ProviderName,
        ["ServiceTypes"] = new BsonArray(request.ServiceTypes.Select(value => value.ToString())),
        ["MedicalCredentials"] = CredentialToDocument(request.MedicalCredentials),
        ["BeautyCredentials"] = CredentialToDocument(request.BeautyCredentials),
        ["FitnessCredentials"] = CredentialToDocument(request.FitnessCredentials),
        ["IsReviewed"] = request.IsReviewed,
        ["IsApproved"] = request.IsApproved,
        ["Notes"] = request.Notes ?? string.Empty,
        ["SubmittedAt"] = BsonValue.Create(request.SubmittedAt.UtcDateTime),
        ["ReviewedAt"] = request.ReviewedAt is null
            ? BsonNull.Value
            : BsonValue.Create(request.ReviewedAt.Value.UtcDateTime),
        ["IsDeleted"] = request.IsDeleted,
        ["DeletedAt"] = request.DeletedAt is null
            ? BsonNull.Value
            : BsonValue.Create(request.DeletedAt.Value.UtcDateTime),
    };

    private static ProviderRequest Map(BsonDocument d) => new()
    {
        Id = ReadId(d, "_id") ?? Guid.NewGuid().ToString("N"),
        UserId = ReadString(d, "UserId") ?? string.Empty,
        ProviderName = ReadString(d, "ProviderName") ?? string.Empty,
        ServiceTypes = ReadServiceTypes(d),
        MedicalCredentials = ReadCredential(d, "MedicalCredentials"),
        BeautyCredentials = ReadCredential(d, "BeautyCredentials"),
        FitnessCredentials = ReadCredential(d, "FitnessCredentials"),
        IsReviewed = ReadBool(d, "IsReviewed"),
        IsApproved = ReadBool(d, "IsApproved"),
        Notes = ReadString(d, "Notes") ?? string.Empty,
        SubmittedAt = ReadDate(d, "SubmittedAt") ?? DateTimeOffset.UtcNow,
        ReviewedAt = ReadDate(d, "ReviewedAt"),
        IsDeleted = ReadBool(d, "IsDeleted"),
        DeletedAt = ReadDate(d, "DeletedAt"),
    };

    private static BsonValue? CredentialToDocument(ServiceCredential? credential) =>
        credential is null
            ? BsonNull.Value
            : new BsonDocument { ["Info"] = BsonValue.Create(credential.Info) };

    private static ServiceCredential? ReadCredential(BsonDocument d, string key)
    {
        var element = FindElement(d, key);
        if (element is null || element.Value.Value is not BsonDocument credential)
        {
            return null;
        }

        return new ServiceCredential { Info = ReadString(credential, "Info") };
    }

    private static List<AppointmentCategory> ReadServiceTypes(BsonDocument d)
    {
        var element = FindElement(d, "ServiceTypes");
        if (element is null || !element.Value.Value.IsBsonArray)
        {
            return [];
        }

        return element.Value.Value.AsBsonArray
            .Select(value => value.IsString ? value.AsString : value.ToString())
            .Select(value => Enum.TryParse<AppointmentCategory>(value, true, out var category) ? category : (AppointmentCategory?)null)
            .Where(category => category.HasValue)
            .Select(category => category!.Value)
            .Distinct()
            .ToList();
    }

    private static bool IsDeleted(BsonDocument doc) => ReadBool(doc, "IsDeleted");

    private static BsonElement? FindElement(BsonDocument doc, string key)
    {
        if (doc.TryGetElement(key, out var direct))
        {
            return direct;
        }

        foreach (var element in doc.Elements)
        {
            if (string.Equals(element.Name, key, StringComparison.OrdinalIgnoreCase))
            {
                return element;
            }
        }

        return null;
    }

    private static bool ReadBool(BsonDocument doc, string key)
    {
        var element = FindElement(doc, key);
        if (element is null || element.Value.Value is BsonNull)
        {
            return false;
        }

        return element.Value.Value switch
        {
            BsonBoolean b => b.Value,
            BsonInt32 i => i.Value != 0,
            BsonInt64 l => l.Value != 0,
            BsonString s => s.Value.Trim().Equals("true", StringComparison.OrdinalIgnoreCase)
                || s.Value.Trim() == "1",
            _ => false,
        };
    }



    private static string? ReadString(BsonDocument doc, params string[] keys)
    {
        foreach (var key in keys)
        {
            var element = FindElement(doc, key);
            if (element is null || element.Value.Value is BsonNull)
            {
                continue;
            }

            var text = element.Value.Value switch
            {
                BsonString s => s.Value,
                BsonObjectId oid => oid.Value.ToString(),
                _ => element.Value.Value.ToString(),
            };
            if (!string.IsNullOrWhiteSpace(text))
            {
                return text.Trim();
            }
        }

        return null;
    }

    private static DateTimeOffset? ReadDate(BsonDocument doc, string key)
    {
        var element = FindElement(doc, key);
        if (element is null || element.Value.Value is not BsonDateTime dt)
        {
            return null;
        }

        return new DateTimeOffset(dt.ToUniversalTime(), TimeSpan.Zero);
    }

    private static string? ReadId(BsonDocument doc, string key)
    {
        var element = FindElement(doc, key);
        if (element is null || element.Value.Value is BsonNull)
        {
            return null;
        }

        var raw = element.Value.Value switch
        {
            BsonObjectId oid => oid.Value.ToString(),
            BsonString s => s.Value.Trim(),
            _ => element.Value.Value.ToString()?.Trim(),
        };
        return string.IsNullOrWhiteSpace(raw) || raw == "null" ? null : raw;
    }
}
