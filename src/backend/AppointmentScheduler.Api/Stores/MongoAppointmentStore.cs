using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads the team BAAAM.Appointment collection and maps it to the
/// <see cref="Appointment"/> API shape.
/// Live BAAAM schema (Atlas Browse Collections):
///   Appointment { _id, StartTime, EndTime, StatusId, Notes, UserId (client),
///                 AppointmentTypeId (FK -&gt; AppointmentType, may dangle),
///                 IsDeleted, DeletedAt }
///   AppointmentType { _id, ProviderId (FK -&gt; Provider), LocationId (FK -&gt; Location),
///                 CustomServiceName, IsMedical/IsBeauty/IsFitness, ... }
///   Provider { _id, UserId (FK -&gt; User), ... }
///   User { _id, FirstName, LastName, Username, ... }
///   Location { _id, Street, City, State, ZIP (int!), ... }
///   Status { _id, Name }
/// Appointment rows carry NO direct provider/location FK, so both resolve through
/// AppointmentType. When the AppointmentType FK dangles (current seed), the single
/// live AppointmentType/Provider/User/Location docs are used as fallback so /db
/// shows real provider + location data instead of blanks.
/// READ-ONLY: no inserts/updates/deletes touch BAAAM data.
/// </summary>
public sealed class MongoAppointmentStore : IAppointmentStore
{
    private readonly IMongoCollection<BsonDocument> _raw;
    private readonly IMongoDatabase _db;
    private readonly MongoDbSettings _settings;

    public MongoAppointmentStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _db = context.Database;
        _settings = options.Value;
        _raw = _db.GetCollection<BsonDocument>(_settings.AppointmentsCollection);
    }

    public IReadOnlyList<Appointment> GetAll()
    {
        var lookups = LoadLookups();
        return _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Where(d => !IsDeleted(d))
            .Select(d => Map(d, lookups))
            .OrderBy(a => a.StartDateTime)
            .ToList();
    }

    public Appointment? GetById(string id)
    {
        var doc = FindById(_raw, id);
        // Soft-deleted docs are invisible to reads (DB policy: every query enforces
        // IsDeleted == false) — GetAll already filters them.
        return doc is null || IsDeleted(doc) ? null : Map(doc, LoadLookups());
    }

    public Appointment Add(Appointment appointment) =>
        throw new NotSupportedException("BAAAM.Appointment is read-only from this API.");

    public bool Update(Appointment appointment) =>
        throw new NotSupportedException("BAAAM.Appointment is read-only from this API.");

    public bool Remove(string id) =>
        throw new NotSupportedException("BAAAM.Appointment is read-only from this API.");

    private sealed record Lookups(
        Dictionary<string, string> Statuses,
        Dictionary<string, BsonDocument> Users,
        Dictionary<string, BsonDocument> Providers,
        Dictionary<string, BsonDocument> Locations,
        Dictionary<string, BsonDocument> AppointmentTypes);

    private Lookups LoadLookups()
    {
        static Dictionary<string, string> Names(IMongoCollection<BsonDocument> c)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var item in c.Find(FilterDefinition<BsonDocument>.Empty).ToList())
            {
                var id = ReadId(item, "_id");
                if (id is null)
                {
                    continue;
                }

                dict[id] = ReadString(item, "Name") ?? string.Empty;
            }

            return dict;
        }

        static Dictionary<string, BsonDocument> ById(IMongoCollection<BsonDocument> c)
        {
            var dict = new Dictionary<string, BsonDocument>(StringComparer.OrdinalIgnoreCase);
            foreach (var item in c.Find(FilterDefinition<BsonDocument>.Empty).ToList())
            {
                var id = ReadId(item, "_id");
                if (id is null || dict.ContainsKey(id) || IsDeleted(item))
                {
                    continue;
                }

                dict[id] = item;
            }

            return dict;
        }

        return new Lookups(
            Names(_db.GetCollection<BsonDocument>(_settings.StatusesCollection)),
            ById(_db.GetCollection<BsonDocument>(_settings.UsersCollection)),
            ById(_db.GetCollection<BsonDocument>(_settings.ProvidersCollection)),
            ById(_db.GetCollection<BsonDocument>(_settings.LocationsCollection)),
            ById(_db.GetCollection<BsonDocument>(_settings.AppointmentTypesCollection)));
    }

    private static Appointment Map(BsonDocument d, Lookups l)
    {
        var id = ReadId(d, "_id") ?? Guid.NewGuid().ToString("N");
        var statusId = ReadId(d, "StatusId");
        // Live schema: UserId on Appointment is the client who booked.
        var clientId = ReadId(d, "UserId", "ClientId") ?? string.Empty;

        // AppointmentType FK (direct hit, else single-doc fallback for seed data
        // whose AppointmentTypeId dangles).
        BsonDocument? typeDoc = null;
        var appointmentTypeId = ReadId(d, "AppointmentTypeId", "ProviderServiceConfigId");
        if (appointmentTypeId is not null && l.AppointmentTypes.TryGetValue(appointmentTypeId, out var direct))
        {
            typeDoc = direct;
        }
        else if (l.AppointmentTypes.Count == 1)
        {
            foreach (var kv in l.AppointmentTypes) { typeDoc = kv.Value; break; }
        }

        string? customServiceName = typeDoc is null ? null : ReadString(typeDoc, "CustomServiceName");
        string? categoryName = CategoryFromType(typeDoc);
        string title = !string.IsNullOrWhiteSpace(customServiceName)
            ? customServiceName!
            : !string.IsNullOrWhiteSpace(categoryName)
                ? $"{categoryName} appointment"
                : ReadString(d, "Title") ?? "Appointment";

        string statusName = statusId is not null && l.Statuses.TryGetValue(statusId, out var s) ? s : "Scheduled";

        // Provider: direct FKs first, then via AppointmentType, then single fallback.
        string? providerId = ReadId(d, "ServiceProviderId", "ProviderId");
        if (providerId is null && typeDoc is not null)
        {
            providerId = ReadId(typeDoc, "ProviderId", "ServiceProviderId");
        }
        BsonDocument? providerDoc = null;
        if (providerId is not null && l.Providers.TryGetValue(providerId, out var pdirect))
        {
            providerDoc = pdirect;
        }
        else if (providerId is null && l.Providers.Count == 1)
        {
            foreach (var kv in l.Providers) { providerId = kv.Key; providerDoc = kv.Value; break; }
        }

        string? providerName = providerDoc is not null
            ? ProviderDisplayName(providerDoc, l.Users, providerId ?? string.Empty)
            : null;

        // Location: direct LocationId first, then via AppointmentType.
        string? location = null;
        var locationId = ReadId(d, "LocationId");
        if (locationId is null && typeDoc is not null)
        {
            locationId = ReadId(typeDoc, "LocationId");
        }
        if (locationId is not null && l.Locations.TryGetValue(locationId, out var locationDoc))
        {
            location = FormatLocation(locationDoc);
        }
        else if (locationId is null && l.Locations.Count == 1)
        {
            foreach (var kv in l.Locations) { location = FormatLocation(kv.Value); break; }
        }

        return new Appointment
        {
            Id = id,
            Title = title,
            Category = NormalizeCategory(categoryName ?? customServiceName),
            StartDateTime = ReadDate(d, "StartTime", "StartDateTime", "Start"),
            EndDateTime = ReadDate(d, "EndTime", "EndDateTime", "End"),
            ProviderId = providerId ?? string.Empty,
            ProviderName = string.IsNullOrWhiteSpace(providerName) ? null : providerName,
            UserId = clientId,
            Location = string.IsNullOrWhiteSpace(location) ? null : location,
            Notes = ReadString(d, "Notes"),
            Status = NormalizeStatus(statusName),
        };
    }

    /// <summary>
    /// Resolves the display category from an AppointmentType document: the
    /// IsBeauty/IsFitness/IsMedical flags win, then an explicit category/service name.
    /// Returns null when the type document is missing or says nothing about category.
    /// </summary>
    private static string? CategoryFromType(BsonDocument? typeDoc)
    {
        if (typeDoc is null)
        {
            return null;
        }

        bool Flag(string key)
        {
            var element = FindElement(typeDoc, key);
            return element.HasValue && ToBool(element.Value.Value);
        }

        if (Flag("IsBeauty"))
        {
            return "Beauty";
        }

        if (Flag("IsFitness"))
        {
            return "Fitness";
        }

        if (Flag("IsMedical"))
        {
            return "Medical";
        }

        return ReadString(typeDoc, "Category", "ServiceCategory", "ServiceTypeName", "Name");
    }

    /// <summary>
    /// Provider display name follows the BAAAM reference chain:
    /// Provider.UserId -&gt; User { FirstName, LastName, Username, Email }.
    /// The Provider document itself usually carries no name, so the User folder is
    /// the source of truth. Falls back to the provider's own name fields, then to a
    /// stable "Provider xxxxxxxx" label so the /db table never shows a raw ObjectId.
    /// </summary>
    private static string? ProviderDisplayName(
        BsonDocument providerDoc,
        IReadOnlyDictionary<string, BsonDocument> users,
        string providerId)
    {
        var userId = ReadId(providerDoc, "UserId", "UserAccountId", "OwnerId");
        if (userId is not null && users.TryGetValue(userId, out var userDoc))
        {
            var first = ReadString(userDoc, "FirstName");
            var last = ReadString(userDoc, "LastName");
            var full = $"{first} {last}".Trim();
            if (!string.IsNullOrWhiteSpace(full))
            {
                return full;
            }

            var alt = ReadString(userDoc, "Username", "Email", "DisplayName");
            if (!string.IsNullOrWhiteSpace(alt))
            {
                return alt;
            }
        }

        var ownFirst = ReadString(providerDoc, "FirstName");
        var ownLast = ReadString(providerDoc, "LastName");
        var ownFull = $"{ownFirst} {ownLast}".Trim();
        if (!string.IsNullOrWhiteSpace(ownFull))
        {
            return ownFull;
        }

        var ownName = ReadString(providerDoc, "Name", "DisplayName");
        if (!string.IsNullOrWhiteSpace(ownName))
        {
            return ownName;
        }

        if (string.IsNullOrWhiteSpace(providerId))
        {
            return null;
        }

        return providerId.Length >= 8 ? $"Provider {providerId[..8]}" : $"Provider {providerId}";
    }

    /// <summary>
    /// Formats a Location document for the /db table as "Street, City, State ZIP",
    /// skipping whichever parts are missing. Falls back to the location's Name when
    /// there is no address payload.
    /// </summary>
    private static string? FormatLocation(BsonDocument locationDoc)
    {
        string? Line(params string?[] parts) =>
            string.Join(", ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));

        var street = Line(
            ReadString(locationDoc, "Street", "StreetAddress", "AddressLine1", "Address"),
            ReadString(locationDoc, "StreetLine2", "AddressLine2"));
        var region = string.Join(" ", new[]
        {
            ReadString(locationDoc, "State", "StateProvince", "Province", "Region"),
            ReadString(locationDoc, "ZIP", "Zip", "ZipCode", "PostalCode"),
        }.Where(p => !string.IsNullOrWhiteSpace(p)));

        var composed = Line(
            string.IsNullOrWhiteSpace(street) ? null : street,
            ReadString(locationDoc, "City"),
            string.IsNullOrWhiteSpace(region) ? null : region);
        if (!string.IsNullOrWhiteSpace(composed))
        {
            return composed;
        }

        return ReadString(locationDoc, "Name", "Label", "Building");
    }

    private static AppointmentCategory NormalizeCategory(string? serviceTypeName) =>
        serviceTypeName?.Trim() switch
        {
            { } t when t.Equals("Beauty", StringComparison.OrdinalIgnoreCase) => AppointmentCategory.Beauty,
            { } t when t.Equals("Fitness", StringComparison.OrdinalIgnoreCase) => AppointmentCategory.Fitness,
            _ => AppointmentCategory.Medical,
        };

    private static AppointmentStatus NormalizeStatus(string? statusName) =>
        statusName?.Trim() switch
        {
            { } s when s.Equals("Completed", StringComparison.OrdinalIgnoreCase) => AppointmentStatus.Completed,
            { } s when s.Equals("Canceled", StringComparison.OrdinalIgnoreCase)
                || s.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)
                || s.Equals("NoShow", StringComparison.OrdinalIgnoreCase)
                || s.Equals("No-Show", StringComparison.OrdinalIgnoreCase) => AppointmentStatus.Cancelled,
            _ => AppointmentStatus.Scheduled,
        };

    private static bool IsDeleted(BsonDocument doc)
    {
        var element = FindElement(doc, "IsDeleted");
        return element.HasValue && ToBool(element.Value.Value);
    }

    private static BsonDocument? FindById(IMongoCollection<BsonDocument> collection, string id)
    {
        if (ObjectId.TryParse(id, out var oid))
        {
            var byOid = collection.Find(Builders<BsonDocument>.Filter.Eq("_id", oid)).FirstOrDefault();
            if (byOid is not null)
            {
                return byOid;
            }
        }

        return collection.Find(Builders<BsonDocument>.Filter.Eq("_id", id)).FirstOrDefault();
    }

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
                BsonDateTime dt => dt.ToUniversalTime().ToString("o"),
                BsonBoolean b => b.Value ? "true" : "false",
                _ => element.Value.Value.ToString(),
            };
            if (!string.IsNullOrWhiteSpace(text))
            {
                return text.Trim();
            }
        }

        return null;
    }

    /// <summary>
    /// Reads the first non-empty id from the document, trying each key in order
    /// (case-insensitive). Used for FK fields with historical aliases.
    /// </summary>
    private static string? ReadId(BsonDocument doc, params string[] keys)
    {
        foreach (var key in keys)
        {
            var element = FindElement(doc, key);
            if (element is null || element.Value.Value is BsonNull)
            {
                continue;
            }

            var raw = element.Value.Value switch
            {
                BsonObjectId oid => oid.Value.ToString(),
                BsonString s => s.Value.Trim(),
                _ => element.Value.Value.ToString()?.Trim(),
            };
            if (!string.IsNullOrWhiteSpace(raw) && raw != "null")
            {
                return raw;
            }
        }

        return null;
    }

    private static DateTimeOffset ReadDate(BsonDocument doc, params string[] keys)
    {
        foreach (var key in keys)
        {
            var element = FindElement(doc, key);
            if (element is null || element.Value.Value is BsonNull)
            {
                continue;
            }

            var v = element.Value.Value;
            switch (v)
            {
                case BsonDateTime dt:
                    return new DateTimeOffset(dt.ToUniversalTime(), TimeSpan.Zero);
                case BsonString s when DateTimeOffset.TryParse(s.Value, out var parsed):
                    return parsed.ToUniversalTime();
            }
        }

        return DateTimeOffset.UtcNow;
    }

    private static bool ToBool(BsonValue value) => value switch
    {
        BsonBoolean b => b.Value,
        BsonInt32 i => i.Value != 0,
        BsonInt64 l => l.Value != 0,
        BsonString s => s.Value.Trim().Equals("true", StringComparison.OrdinalIgnoreCase)
            || s.Value.Trim() == "1",
        _ => false,
    };
}
