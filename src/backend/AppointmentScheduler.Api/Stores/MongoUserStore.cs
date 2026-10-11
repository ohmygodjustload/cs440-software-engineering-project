using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads the existing team BAAAM.User collection. READ-ONLY and NEVER returns
/// Password. New documents are never created here.
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
    };

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
