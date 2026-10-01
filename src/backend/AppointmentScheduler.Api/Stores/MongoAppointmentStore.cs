using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads the team BAAAM.Appointment collection (ObjectId refs, StartTime/EndTime,
/// StatusId/ServiceTypeId) and maps it to the <see cref="Appointment"/> API shape.
/// READ-ONLY for now: no inserts/updates/deletes touch BAAAM data.
/// </summary>
public sealed class MongoAppointmentStore : IAppointmentStore
{
    private readonly IMongoCollection<BsonDocument> _raw;
    private readonly IMongoDatabase _db;

    public MongoAppointmentStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _db = context.Database;
        _raw = _db.GetCollection<BsonDocument>(options.Value.AppointmentsCollection);
    }

    public IReadOnlyList<Appointment> GetAll()
    {
        var lookups = LoadLookups();
        return _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(d => d["StartTime"])
            .ToList()
            .Select(d => Map(d, lookups))
            .ToList();
    }

    public Appointment? GetById(string id)
    {
        if (!ObjectId.TryParse(id, out var oid))
        {
            return null;
        }

        var doc = _raw.Find(Builders<BsonDocument>.Filter.Eq("_id", oid)).FirstOrDefault();
        return doc is null ? null : Map(doc, LoadLookups());
    }

    public Appointment Add(Appointment appointment) =>
        throw new NotSupportedException("BAAAM.Appointment is read-only from this API.");

    public bool Update(Appointment appointment) =>
        throw new NotSupportedException("BAAAM.Appointment is read-only from this API.");

    public bool Remove(string id) =>
        throw new NotSupportedException("BAAAM.Appointment is read-only from this API.");

    private sealed record Lookups(
        Dictionary<string, string> Statuses,
        Dictionary<string, string> Types,
        Dictionary<string, BsonDocument> Users,
        Dictionary<string, BsonDocument> Providers,
        Dictionary<string, BsonDocument> Locations);

    private Lookups LoadLookups()
    {
        static Dictionary<string, string> Names(IMongoCollection<BsonDocument> c) =>
            c.Find(FilterDefinition<BsonDocument>.Empty).ToList()
                .ToDictionary(d => d["_id"].AsObjectId.ToString(), d => d.GetValue("Name", "").AsString);
        static Dictionary<string, BsonDocument> ById(IMongoCollection<BsonDocument> c) =>
            c.Find(FilterDefinition<BsonDocument>.Empty).ToList()
                .ToDictionary(d => d["_id"].AsObjectId.ToString(), d => d);
        return new Lookups(
            Names(_db.GetCollection<BsonDocument>("Status")),
            Names(_db.GetCollection<BsonDocument>("ServiceType")),
            ById(_db.GetCollection<BsonDocument>("User")),
            ById(_db.GetCollection<BsonDocument>("ServiceProvider")),
            ById(_db.GetCollection<BsonDocument>("Location")));
    }

    private static Appointment Map(BsonDocument d, Lookups l)
    {
        var id = d["_id"].AsObjectId.ToString();
        var statusId = d.GetValue("StatusId", BsonNull.Value) is BsonObjectId s ? s.Value.ToString() : "";
        var typeId = d.GetValue("ServiceTypeId", BsonNull.Value) is BsonObjectId t ? t.Value.ToString() : "";
        var providerId = d.GetValue("ServiceProviderId", BsonNull.Value) is BsonObjectId p ? p.Value.ToString() : "";
        var clientId = d.GetValue("ClientId", BsonNull.Value) is BsonObjectId c ? c.Value.ToString() : "";
        var typeName = l.Types.GetValueOrDefault(typeId, "Medical");
        var statusName = l.Statuses.GetValueOrDefault(statusId, "Scheduled");

        string? providerName = null;
        if (l.Providers.TryGetValue(providerId, out var prov) &&
            prov.GetValue("userId", BsonNull.Value) is BsonObjectId puid &&
            l.Users.TryGetValue(puid.Value.ToString(), out var puser))
        {
            providerName = $"{puser.GetValue("FirstName", "").AsString} {puser.GetValue("LastName", "").AsString}".Trim();
        }

        string? location = null;
        if (d.GetValue("LocationId", BsonNull.Value) is BsonObjectId locId &&
            l.Locations.TryGetValue(locId.Value.ToString(), out var loc))
        {
            location = $"{loc.GetValue("Street", "").AsString}, {loc.GetValue("City", "").AsString}, {loc.GetValue("State", "").AsString} {loc.GetValue("ZIP", "").ToString()}".Trim(' ', ',');
        }

        return new Appointment
        {
            Id = id,
            Title = $"{typeName} appointment",
            Category = typeName == "Beauty" ? AppointmentCategory.Beauty : typeName == "Fitness" ? AppointmentCategory.Fitness : AppointmentCategory.Medical,
            Start = ToDto(d.GetValue("StartTime", BsonNull.Value)),
            End = ToDto(d.GetValue("EndTime", BsonNull.Value)),
            ProviderId = providerId,
            ProviderName = providerName,
            UserId = clientId,
            Location = location,
            Notes = d.GetValue("Notes", BsonNull.Value) is BsonString n ? n.Value : null,
            Status = statusName == "Canceled" ? AppointmentStatus.Cancelled : statusName == "Completed" ? AppointmentStatus.Completed : AppointmentStatus.Scheduled,
        };
    }

    private static DateTimeOffset ToDto(BsonValue v) => v switch
    {
        BsonDateTime dt => new DateTimeOffset(dt.ToUniversalTime(), TimeSpan.Zero),
        BsonString s when DateTimeOffset.TryParse(s.Value, out var p) => p.ToUniversalTime(),
        _ => DateTimeOffset.UtcNow,
    };
}
