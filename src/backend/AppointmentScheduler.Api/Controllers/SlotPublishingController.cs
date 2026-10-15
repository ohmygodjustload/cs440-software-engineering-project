using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Authorize(Roles = "ServiceProvider")]
[Route("api/slots/publish")]
public sealed class SlotPublishingController(
    IUserStore users, IProviderStore providers, IAppointmentStore appointments,
    IServiceProvider services, IOptions<MongoDbSettings> options,
    ILogger<SlotPublishingController> logger) : ControllerBase
{
    private static readonly SemaphoreSlim MemoryGate = new(1, 1);

    [HttpPost]
    public async Task<ActionResult<Appointment>> Publish(PublishSlotDto dto, CancellationToken token)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var user = users.GetById(userId);
        if (user is null || !user.IsActive || !user.IsServiceProvider) return Forbid();
        if (dto.Category is null || !user.ServiceTypes.Contains(dto.Category.Value)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Location) ||
            dto.Title.Length > 200 || dto.Location.Length > 300 || dto.Notes?.Length > 2000)
            return BadRequest("Enter a service title and location within the allowed lengths.");
        if (dto.StartDateTime is null || dto.StartDateTime <= DateTimeOffset.UtcNow)
            return BadRequest("Start time must be in the future.");

        try
        {
            var context = services.GetService<MongoDbContext>();
            var result = context is null
                ? await PublishMemory(user, dto, token)
                : await PublishMongo(context, user, dto, token);
            return Created($"/api/appointments/{result.Id}", result);
        }
        catch (SlotOverlapException) { return Conflict("This time overlaps an existing slot or appointment."); }
        catch (ProviderAccessException) { return Forbid(); }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError(ex, "Slot publication failed for account {UserId}", userId);
            return StatusCode(503, "The slot could not be published. Please retry.");
        }
    }

    [HttpPost("batch")]
    public async Task<IActionResult> PublishBatch(PublishSlotBatchDto dto, CancellationToken token)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var user = users.GetById(userId);
        if (user is null || !user.IsActive || !user.IsServiceProvider) return Forbid();
        if (dto.Slots is null || dto.Slots.Count is < 1 or > 24) return BadRequest("Select between 1 and 24 slots.");
        foreach (var slot in dto.Slots)
        {
            if (slot is null || slot.Category is null || !user.ServiceTypes.Contains(slot.Category.Value)) return Forbid();
            if (string.IsNullOrWhiteSpace(slot.Title) || string.IsNullOrWhiteSpace(slot.Location) ||
                slot.Title.Length > 200 || slot.Location.Length > 300 || slot.Notes?.Length > 2000)
                return BadRequest("Enter a service title and location within the allowed lengths.");
            if (slot.StartDateTime is null || slot.StartDateTime <= DateTimeOffset.UtcNow)
                return BadRequest("Every slot must start in the future.");
        }
        var ordered = dto.Slots.OrderBy(slot => slot.StartDateTime).ToList();
        if (ordered.Zip(ordered.Skip(1)).Any(pair => pair.First.StartDateTime!.Value.AddMinutes(60) > pair.Second.StartDateTime))
            return Conflict("Selected 60-minute slots overlap. Choose start times at least one hour apart.");
        try
        {
            var context = services.GetService<MongoDbContext>();
            var result = context is null
                ? await PublishMemoryBatch(user, ordered, token)
                : await PublishMongoBatch(context, user, ordered, token);
            return StatusCode(201, result);
        }
        catch (SlotOverlapException) { return Conflict("At least one selected time overlaps an existing slot. No slots were published."); }
        catch (ProviderAccessException) { return Forbid(); }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError(ex, "Batch slot publication failed for account {UserId}", userId);
            return StatusCode(503, "Publication could not be confirmed. Check your slots before retrying.");
        }
    }

    private async Task<Appointment> PublishMemory(User user, PublishSlotDto dto, CancellationToken token) =>
        (await PublishMemoryBatch(user, [dto], token))[0];

    private async Task<List<Appointment>> PublishMemoryBatch(User user, List<PublishSlotDto> drafts, CancellationToken token)
    {
        await MemoryGate.WaitAsync(token);
        try
        {
            var providerId = StableProviderId(user.Id);
            var planned = drafts.Select(dto => Build(user, dto, user.Id, Guid.NewGuid().ToString("N"))).ToList();
            var existing = appointments.GetAll();
            if (planned.Any(slot => existing.Any(a => !a.IsDeleted &&
                (a.ProviderId == providerId || a.ProviderId == user.Id) &&
                a.Status != AppointmentStatus.Canceled &&
                a.StartDateTime < slot.EndDateTime && slot.StartDateTime < a.EndDateTime)))
                throw new SlotOverlapException();
            if (providers.GetById(providerId) is null)
            {
                providers.Add(new Provider
                {
                    Id = providerId,
                    Name = planned[0].ProviderName!,
                    IsApproved = true,
                    Specialty = drafts[0].Category!.Value.ToString(),
                    Email = user.Email,
                    Phone = user.Phone
                });
            }
            return planned.Select(appointments.AddSlot).ToList();
        }
        finally { MemoryGate.Release(); }
    }

    private async Task<Appointment> PublishMongo(MongoDbContext context, User user, PublishSlotDto dto, CancellationToken token) =>
        (await PublishMongoBatch(context, user, [dto], token))[0];

    private async Task<List<Appointment>> PublishMongoBatch(MongoDbContext context, User user, List<PublishSlotDto> drafts, CancellationToken token)
    {
        var settings = options.Value;
        var db = context.Database;
        var accountRows = db.GetCollection<BsonDocument>(settings.UsersCollection);
        var providerRows = db.GetCollection<BsonDocument>(settings.ProvidersCollection);
        var typeRows = db.GetCollection<BsonDocument>(settings.AppointmentTypesCollection);
        var locationRows = db.GetCollection<BsonDocument>(settings.LocationsCollection);
        var slotRows = db.GetCollection<BsonDocument>(settings.AppointmentsCollection);
        var statusRows = db.GetCollection<BsonDocument>(settings.StatusesCollection);
        using var session = await context.Client.StartSessionAsync(cancellationToken: token);

        return await session.WithTransactionAsync(async (transaction, ct) =>
        {
            var published = new List<Appointment>();
            foreach (var dto in drafts)
            {
                // Updating the account document serializes publication for this provider across API processes.
                // A conflicting transaction is retried by the driver before any writes become visible.
                var accountFilter = IdFilter("_id", user.Id) &
                    Builders<BsonDocument>.Filter.Ne("IsDeleted", true) &
                    Builders<BsonDocument>.Filter.Eq("IsActive", true) &
                    Builders<BsonDocument>.Filter.Eq("IsServiceProvider", true);
                var account = await accountRows.FindOneAndUpdateAsync(transaction, accountFilter,
                    Builders<BsonDocument>.Update.Inc("SlotPublishVersion", 1),
                    new FindOneAndUpdateOptions<BsonDocument> { ReturnDocument = ReturnDocument.After }, ct);
                if (account is null) throw new ProviderAccessException();
                var allowed = account.GetValue("ServiceTypes", new BsonArray()).AsBsonArray;
                if (!allowed.Any(v => string.Equals(v.ToString(), dto.Category!.Value.ToString(), StringComparison.OrdinalIgnoreCase)))
                    throw new ProviderAccessException();
                if (dto.StartDateTime <= DateTimeOffset.UtcNow) throw new ProviderAccessException();

                var matches = await providerRows.Find(transaction,
                    IdFilter("UserId", user.Id) & Builders<BsonDocument>.Filter.Ne("IsDeleted", true)).ToListAsync(ct);
                if (matches.Count > 1) throw new InvalidOperationException("Multiple provider records are linked to this account; resolve them before publishing.");
                var provider = matches.SingleOrDefault();
                if (provider is not null && provider.GetValue("IsApproved", BsonBoolean.False) != BsonBoolean.True)
                    throw new ProviderAccessException();
                var providerKey = provider?["_id"] ?? Ref(StableProviderId(user.Id));
                var providerId = providerKey.ToString()!;
                var types = await typeRows.Find(transaction,
                    (IdFilter("ProviderId", providerId) | IdFilter("ProviderId", user.Id)) &
                    Builders<BsonDocument>.Filter.Ne("IsDeleted", true)).ToListAsync(ct);
                var typeKeys = new BsonArray(types.Select(t => t["_id"]));
                var statuses = await statusRows.Find(transaction, Builders<BsonDocument>.Filter.Empty).ToListAsync(ct);
                var available = statuses.SingleOrDefault(d => Name(d).Equals("Available", StringComparison.OrdinalIgnoreCase))
                    ?? throw new InvalidOperationException("The Status collection must contain Available.");
                var canceled = new BsonArray(statuses.Where(d => new[] { "Canceled", "Cancelled" }.Contains(Name(d), StringComparer.OrdinalIgnoreCase)).Select(d => d["_id"]));
                var start = dto.StartDateTime!.Value.ToUniversalTime();
                var end = start.AddMinutes(60);
                var conflict = new BsonDocument {
                { "IsDeleted", new BsonDocument("$ne", true) },
                { "StatusId", new BsonDocument("$nin", canceled) },
                { "StartTime", new BsonDocument("$lt", end.UtcDateTime) },
                { "EndTime", new BsonDocument("$gt", start.UtcDateTime) },
                { "$or", new BsonArray {
                    new BsonDocument("AppointmentTypeId", new BsonDocument("$in", typeKeys)),
                    new BsonDocument("ProviderId", providerKey),
                    new BsonDocument("ProviderId", Ref(user.Id))
                } }
            };
                if (await slotRows.Find(transaction, conflict).AnyAsync(ct)) throw new SlotOverlapException();

                if (provider is null)
                {
                    await providerRows.InsertOneAsync(transaction, new BsonDocument {
                    { "_id", providerKey }, { "UserId", Ref(user.Id) }, { "IsApproved", true }, { "IsDeleted", false },
                    { "IsMedical", user.ServiceTypes.Contains(AppointmentCategory.Medical) },
                    { "IsBeauty", user.ServiceTypes.Contains(AppointmentCategory.Beauty) },
                    { "IsFitness", user.ServiceTypes.Contains(AppointmentCategory.Fitness) }
                }, cancellationToken: ct);
                }
                var locationKey = ObjectId.GenerateNewId();
                await locationRows.InsertOneAsync(transaction, new BsonDocument {
                { "_id", locationKey }, { "Street", dto.Location.Trim() }, { "City", "" }, { "State", "" },
                { "ZIP", 0 }, { "DisplayName", dto.Location.Trim() }, { "IsDeleted", false }
            }, cancellationToken: ct);
                var typeKey = ObjectId.GenerateNewId();
                await typeRows.InsertOneAsync(transaction, new BsonDocument {
                { "_id", typeKey }, { "ProviderId", Ref(user.Id) }, { "LocationId", locationKey },
                { "CustomServiceName", dto.Title.Trim() }, { "DurationInMinutes", 60 }, { "Price", 0 },
                { "IsMedical", dto.Category == AppointmentCategory.Medical },
                { "IsBeauty", dto.Category == AppointmentCategory.Beauty },
                { "IsFitness", dto.Category == AppointmentCategory.Fitness }, { "IsDeleted", false }
            }, cancellationToken: ct);
                var slot = Build(user, dto, user.Id, typeKey.ToString());
                var slotKey = ObjectId.GenerateNewId();
                await slotRows.InsertOneAsync(transaction, new BsonDocument {
                { "_id", slotKey }, { "StartTime", start.UtcDateTime }, { "EndTime", end.UtcDateTime },
                { "StatusId", available["_id"] }, { "AppointmentTypeId", typeKey }, { "UserId", BsonNull.Value },
                { "Notes", dto.Notes?.Trim() ?? "" }, { "IsDeleted", false }, { "DeletedAt", BsonNull.Value }
            }, cancellationToken: ct);
                slot.Id = slotKey.ToString();
                published.Add(slot);
            }
            return published;
        }, cancellationToken: token);
    }

    private static Appointment Build(User user, PublishSlotDto dto, string providerId, string typeId) => new()
    {
        Title = dto.Title.Trim(),
        Category = dto.Category!.Value,
        ProviderId = providerId,
        ProviderName = $"{user.FirstName} {user.LastName}".Trim(),
        AppointmentTypeId = typeId,
        StartDateTime = dto.StartDateTime!.Value.ToUniversalTime(),
        EndDateTime = dto.StartDateTime.Value.ToUniversalTime().AddMinutes(60),
        Location = dto.Location.Trim(),
        Notes = dto.Notes?.Trim(),
        UserId = null,
        Status = AppointmentStatus.Available
    };
    private static string StableProviderId(string userId) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("provider:" + userId)))[..24].ToLowerInvariant();
    private static BsonValue Ref(string id) => ObjectId.TryParse(id, out var value) ? value : new BsonString(id);
    private static FilterDefinition<BsonDocument> IdFilter(string field, string id) =>
        Builders<BsonDocument>.Filter.Eq(field, id) | Builders<BsonDocument>.Filter.Eq(field, Ref(id));
    private static string Name(BsonDocument doc) => doc.GetValue("Name", "").AsString;
    private sealed class SlotOverlapException : Exception { }
    private sealed class ProviderAccessException : Exception { }
}
