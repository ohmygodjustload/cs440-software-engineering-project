using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads and writes users in the existing team BAAAM.User collection.
/// Password hashes are stored for authentication, but never returned by the API.
/// </summary>
public sealed class MongoUserStore : IUserStore
{
    private readonly IMongoCollection<BsonDocument> _raw;

    public MongoUserStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _raw = context.Database.GetCollection<BsonDocument>(options.Value.UsersCollection);
    }

    public IReadOnlyList<User> GetAll() =>
        _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Where(d => !IsDeleted(d))
            .Select(Map)
            .OrderBy(u => u.Username)
            .ToList();

    public User? GetById(string id)
    {
        var doc = FindById(_raw, id);
        // Soft-deleted users are invisible to reads (GetAll already filters them).
        return doc is null || IsDeleted(doc) ? null : Map(doc);
    }

    public User? GetByUsername(string username)
    {
        var filter = Builders<BsonDocument>.Filter.Regex(
            "Username",
            new BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(username.Trim())}$", "i"));
        var doc = _raw.Find(filter).FirstOrDefault();
        return doc is null || IsDeleted(doc) ? null : Map(doc);
    }

    public User Add(User user)
    {
        if (GetByUsername(user.Username) is not null)
        {
            throw new InvalidOperationException("Username already exists.");
        }

        var id = ObjectId.GenerateNewId();
        var doc = new BsonDocument
        {
            ["_id"] = id,
            ["FirstName"] = user.FirstName,
            ["LastName"] = user.LastName,
            ["Username"] = user.Username,
            ["Email"] = BsonValue.Create(user.Email),
            ["Phone"] = BsonValue.Create(user.Phone),
            ["IsClient"] = user.IsClient,
            ["IsServiceProvider"] = user.IsServiceProvider,
            ["IsAdmin"] = user.IsAdmin,
            ["IsActive"] = user.IsActive,
            ["PasswordHash"] = user.PasswordHash,
            ["ServiceTypes"] = new BsonArray(user.ServiceTypes.Select(value => value.ToString())),
            ["NotifyMedical"] = user.NotifyMedical,
            ["NotifyBeauty"] = user.NotifyBeauty,
            ["NotifyFitness"] = user.NotifyFitness,
        };

        AddCredential(doc, "MedicalCredentials", user.MedicalCredentials);
        AddCredential(doc, "BeautyCredentials", user.BeautyCredentials);
        AddCredential(doc, "FitnessCredentials", user.FitnessCredentials);

        _raw.InsertOne(doc);
        return Map(doc);
    }

    public bool Update(User user)
    {
        var existing = FindById(_raw, user.Id);
        if (existing is null)
        {
            return false;
        }

        var replacement = new BsonDocument
        {
            ["_id"] = existing["_id"],
            ["FirstName"] = user.FirstName,
            ["LastName"] = user.LastName,
            ["Username"] = user.Username,
            ["Email"] = BsonValue.Create(user.Email),
            ["Phone"] = BsonValue.Create(user.Phone),
            ["IsClient"] = user.IsClient,
            ["IsServiceProvider"] = user.IsServiceProvider,
            ["IsAdmin"] = user.IsAdmin,
            ["IsActive"] = user.IsActive,
            ["PasswordHash"] = string.IsNullOrWhiteSpace(user.PasswordHash)
                ? ReadString(existing, "PasswordHash") ?? string.Empty
                : user.PasswordHash,
            ["ServiceTypes"] = new BsonArray(user.ServiceTypes.Select(value => value.ToString())),
            ["NotifyMedical"] = user.NotifyMedical,
            ["NotifyBeauty"] = user.NotifyBeauty,
            ["NotifyFitness"] = user.NotifyFitness,
        };

        AddCredential(replacement, "MedicalCredentials", user.MedicalCredentials);
        AddCredential(replacement, "BeautyCredentials", user.BeautyCredentials);
        AddCredential(replacement, "FitnessCredentials", user.FitnessCredentials);

        // Carry over soft-delete fields that are not part of the API shape.
        var isDeleted = FindElement(existing, "IsDeleted");
        if (isDeleted.HasValue)
        {
            replacement["IsDeleted"] = isDeleted.Value.Value;
        }

        var deletedAt = FindElement(existing, "DeletedAt");
        if (deletedAt.HasValue)
        {
            replacement["DeletedAt"] = deletedAt.Value.Value;
        }

        var result = _raw.ReplaceOne(
            Builders<BsonDocument>.Filter.Eq("_id", existing["_id"]),
            replacement);
        return result.MatchedCount > 0;
    }

    private static User Map(BsonDocument d) => new()
    {
        Id = ReadId(d, "_id") ?? Guid.NewGuid().ToString("N"),
        FirstName = ReadString(d, "FirstName") ?? string.Empty,
        LastName = ReadString(d, "LastName") ?? string.Empty,
        Username = ReadString(d, "Username") ?? ReadString(d, "Email") ?? string.Empty,
        Email = ReadString(d, "Email"),
        Phone = ReadString(d, "Phone"),
        IsClient = ReadBool(d, "IsClient", "IsCustomer"),
        IsActive = ReadBool(d, "IsActive", fallback: true),
        IsServiceProvider = ReadBool(d, "IsServiceProvider", "IsProvider"),
        IsAdmin = ReadBool(d, "IsAdmin", "IsAdministrator"),
        ServiceTypes = ReadServiceTypes(d),
        MedicalCredentials = ReadCredential(d, "MedicalCredentials"),
        BeautyCredentials = ReadCredential(d, "BeautyCredentials"),
        FitnessCredentials = ReadCredential(d, "FitnessCredentials"),
        NotifyMedical = ReadBool(d, "NotifyMedical", fallback: true),
        NotifyBeauty = ReadBool(d, "NotifyBeauty", fallback: true),
        NotifyFitness = ReadBool(d, "NotifyFitness", fallback: true),
        PasswordHash = ReadString(d, "PasswordHash") ?? string.Empty,
    };

    private static void AddCredential(BsonDocument doc, string key, ServiceCredential? credential)
    {
        if (credential is null)
        {
            return;
        }

        doc[key] = new BsonDocument
        {
            ["Info"] = BsonValue.Create(credential.Info),
        };
    }

    private static List<AppointmentCategory> ReadServiceTypes(BsonDocument doc)
    {
        var element = FindElement(doc, "ServiceTypes");
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

    private static ServiceCredential? ReadCredential(BsonDocument doc, string key)
    {
        var element = FindElement(doc, key);
        if (element is null || !element.Value.Value.IsBsonDocument)
        {
            return null;
        }

        var credential = element.Value.Value.AsBsonDocument;
        return new ServiceCredential
        {
            Info = ReadString(credential, "Info"),
        };
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

    private static bool IsDeleted(BsonDocument doc)
    {
        var element = FindElement(doc, "IsDeleted");
        return element.HasValue && ToBool(element.Value.Value);
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

    private static bool ReadBool(BsonDocument doc, string key, string? alias = null, bool fallback = false)
    {
        foreach (var candidate in alias is null ? new[] { key } : new[] { key, alias })
        {
            var element = FindElement(doc, candidate);
            if (element is null || element.Value.Value is BsonNull)
            {
                continue;
            }

            return ToBool(element.Value.Value);
        }

        return fallback;
    }

    private static bool ReadBool(BsonDocument doc, string key, bool fallback)
        => ReadBool(doc, key, null, fallback);

    private static bool ToBool(BsonValue value) => value switch
    {
        BsonBoolean b => b.Value,
        BsonInt32 i => i.Value != 0,
        BsonInt64 l => l.Value != 0,
        BsonDouble dbl => dbl.Value != 0,
        BsonString s => s.Value.Trim().Equals("true", StringComparison.OrdinalIgnoreCase)
            || s.Value.Trim().Equals("yes", StringComparison.OrdinalIgnoreCase)
            || s.Value.Trim() == "1",
        _ => false,
    };
}
