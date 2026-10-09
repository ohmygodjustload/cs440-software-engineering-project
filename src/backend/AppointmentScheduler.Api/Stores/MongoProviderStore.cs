using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads the team BAAAM.ServiceProvider collection (userId/locationId refs)
/// and maps it to the <see cref="Provider"/> API shape.
/// READ-ONLY for now: no inserts/deletes touch BAAAM data.
/// </summary>
public sealed class MongoProviderStore : IProviderStore
{
    private readonly IMongoDatabase _db;
    private readonly IMongoCollection<BsonDocument> _raw;

    public MongoProviderStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _db = context.Database;
        _raw = _db.GetCollection<BsonDocument>(options.Value.ProvidersCollection);
    }

    public IReadOnlyList<Provider> GetAll()
    {
        var users = LoadUsersById();
        return _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Where(d => !IsDeleted(d))
            .Select(d => Map(d, users))
            .OrderBy(p => p.Name)
            .ToList();
    }

    public Provider? GetById(string id)
    {
        var users = LoadUsersById();
        var doc = FindById(_raw, id);
        return doc is null || IsDeleted(doc) ? null : Map(doc, users);
    }

    public Provider Add(Provider provider) =>
        throw new NotSupportedException("BAAAM.ServiceProvider is read-only from this API.");

    public bool Remove(string id) =>
        throw new NotSupportedException("BAAAM.ServiceProvider is read-only from this API.");

    private Dictionary<string, BsonDocument> LoadUsersById()
    {
        var dict = new Dictionary<string, BsonDocument>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in _db.GetCollection<BsonDocument>("User")
            .Find(FilterDefinition<BsonDocument>.Empty).ToList())
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

    /// <summary>Reads a boolean flag (e.g. IsMedical) without caring about BSON type.</summary>
    private static bool Flag(BsonDocument doc, string key)
    {
        var element = FindElement(doc, key);
        return element.HasValue && ToBool(element.Value.Value);
    }

    private static bool IsDeleted(BsonDocument doc)
    {
        var element = FindElement(doc, "IsDeleted");
        return element.HasValue && ToBool(element.Value.Value);
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

    private static Provider Map(BsonDocument d, Dictionary<string, BsonDocument> users)
    {
        var id = ReadId(d, "_id") ?? Guid.NewGuid().ToString("N");
        var fallback = id.Length >= 8 ? $"Provider {id[..8]}" : $"Provider {id}";
        var name = fallback;
        string? email = null;
        string? phone = null;

        // Specialty: the qualification text matching the provider's active discipline
        // flags (Provider { IsMedical / IsBeauty / IsFitness } + { Med, Beauty, Fitness }
        // Qualification). Falls back to the first non-empty qualification so a
        // mislabelled flag never blanks out real data.
        string? specialty = Flag(d, "IsMedical") ? ReadString(d, "MedQualification") : null;
        specialty ??= Flag(d, "IsBeauty") ? ReadString(d, "BeautyQualification") : null;
        specialty ??= Flag(d, "IsFitness") ? ReadString(d, "FitnessQualification") : null;
        specialty ??= ReadString(d, "MedQualification")
            ?? ReadString(d, "BeautyQualification")
            ?? ReadString(d, "FitnessQualification");

        var userId = ReadId(d, "UserId");
        if (userId is not null && users.TryGetValue(userId, out var u))
        {
            var firstName = ReadString(u, "FirstName") ?? "";
            var lastName = ReadString(u, "LastName") ?? "";
            name = $"{firstName} {lastName}".Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                name = ReadString(u, "Username") ?? ReadString(u, "Email") ?? fallback;
            }

            email = ReadString(u, "Email");
            phone = ReadString(u, "Phone");
        }

        return new Provider
        {
            Id = id,
            Name = string.IsNullOrWhiteSpace(name) ? fallback : name,
            Specialty = specialty,
            Email = email,
            Phone = phone,
        };
    }
}
