using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Write-only ledger against BAAAM.AppointmentAuditLog. No soft-delete fields (audit exception).
/// </summary>
public sealed class MongoAppointmentAuditStore : IAppointmentAuditStore
{
    private readonly IMongoCollection<BsonDocument> _raw;
    private readonly IMongoDatabase _db;
    private readonly MongoDbSettings _settings;

    public MongoAppointmentAuditStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _db = context.Database;
        _settings = options.Value;
        _raw = _db.GetCollection<BsonDocument>(_settings.AppointmentAuditLogCollection);
    }

    public void Add(AppointmentAuditEntry entry)
    {
        var doc = new BsonDocument
        {
            { "_id", ObjectId.GenerateNewId() },
            { "AppointmentId", ToObjectIdOrString(entry.AppointmentId) },
            { "ChangedByUserId", ToObjectIdOrString(entry.ChangedByUserId) },
            { "Timestamp", entry.Timestamp.UtcDateTime },
            { "Action", entry.Action },
            { "OldStatusId", StatusIdOrNull(entry.OldStatus) },
            { "NewStatusId", StatusIdOrNull(entry.NewStatus) },
        };
        _raw.InsertOne(doc);
        entry.Id = doc["_id"].AsObjectId.ToString();
    }

    public IReadOnlyList<AppointmentAuditEntry> Query(
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        string? action = null,
        int limit = 200)
    {
        var filters = new List<FilterDefinition<BsonDocument>>();
        if (from.HasValue)
            filters.Add(Builders<BsonDocument>.Filter.Gte("Timestamp", from.Value.UtcDateTime));
        if (to.HasValue)
            filters.Add(Builders<BsonDocument>.Filter.Lt("Timestamp", to.Value.UtcDateTime));
        if (!string.IsNullOrWhiteSpace(action))
            filters.Add(Builders<BsonDocument>.Filter.Eq("Action", action.Trim().ToUpperInvariant()));

        var filter = filters.Count == 0
            ? FilterDefinition<BsonDocument>.Empty
            : Builders<BsonDocument>.Filter.And(filters);

        var statuses = LoadStatusNames();
        return _raw.Find(filter)
            .Sort(Builders<BsonDocument>.Sort.Descending("Timestamp"))
            .Limit(Math.Clamp(limit, 1, 500))
            .ToList()
            .Select(d => Map(d, statuses))
            .ToList();
    }

    private BsonValue StatusIdOrNull(AppointmentStatus? status)
    {
        if (status is null) return BsonNull.Value;
        return FindStatusId(status.Value.ToString()) ?? BsonNull.Value;
    }

    private BsonValue? FindStatusId(string name) =>
        _db.GetCollection<BsonDocument>(_settings.StatusesCollection)
            .Find(Builders<BsonDocument>.Filter.Eq("Name", name)).FirstOrDefault()?["_id"]
        ?? (name == "Canceled"
            ? _db.GetCollection<BsonDocument>(_settings.StatusesCollection)
                .Find(Builders<BsonDocument>.Filter.Eq("Name", "Cancelled")).FirstOrDefault()?["_id"]
            : null);

    private Dictionary<string, string> LoadStatusNames()
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in _db.GetCollection<BsonDocument>(_settings.StatusesCollection)
                     .Find(FilterDefinition<BsonDocument>.Empty).ToList())
        {
            var id = item["_id"].ToString();
            if (id is null) continue;
            dict[id] = item.GetValue("Name", "").AsString;
        }
        return dict;
    }

    private static AppointmentAuditEntry Map(BsonDocument d, IReadOnlyDictionary<string, string> statuses)
    {
        var oldId = ReadId(d, "OldStatusId");
        var newId = ReadId(d, "NewStatusId");
        return new AppointmentAuditEntry
        {
            Id = d["_id"].ToString() ?? Guid.NewGuid().ToString("N"),
            AppointmentId = ReadId(d, "AppointmentId") ?? string.Empty,
            ChangedByUserId = ReadId(d, "ChangedByUserId") ?? string.Empty,
            Timestamp = d.Contains("Timestamp") && d["Timestamp"].IsBsonDateTime
                ? new DateTimeOffset(d["Timestamp"].ToUniversalTime(), TimeSpan.Zero)
                : DateTimeOffset.UtcNow,
            Action = d.GetValue("Action", "").AsString,
            OldStatus = ParseStatus(oldId is not null && statuses.TryGetValue(oldId, out var o) ? o : null),
            NewStatus = ParseStatus(newId is not null && statuses.TryGetValue(newId, out var n) ? n : null),
        };
    }

    private static AppointmentStatus? ParseStatus(string? name) =>
        name?.Trim().ToLowerInvariant() switch
        {
            null or "" => null,
            "available" => AppointmentStatus.Available,
            "completed" => AppointmentStatus.Completed,
            "canceled" or "cancelled" => AppointmentStatus.Canceled,
            "missed" or "noshow" or "no-show" => AppointmentStatus.Missed,
            _ => AppointmentStatus.Booked
        };

    private static string? ReadId(BsonDocument d, string key)
    {
        if (!d.Contains(key) || d[key].IsBsonNull) return null;
        return d[key] switch
        {
            BsonObjectId oid => oid.Value.ToString(),
            BsonString s => s.Value,
            _ => d[key].ToString()
        };
    }

    private static BsonValue ToObjectIdOrString(string s) =>
        ObjectId.TryParse(s, out var oid) ? oid : s;
}
