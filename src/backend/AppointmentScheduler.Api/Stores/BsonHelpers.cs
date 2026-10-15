using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Tolerant readers for raw BAAAM documents: keys match case-insensitively and
/// values may be stored as any reasonable BSON type (e.g. ObjectId or string ids).
/// </summary>
internal static class BsonHelpers {
    /// <summary>Finds a document by ObjectId first, then by string id.</summary>
    public static BsonDocument? FindById(IMongoCollection<BsonDocument> collection, string id) {
        if (ObjectId.TryParse(id, out var oid)) {
            var byOid = collection.Find(Builders<BsonDocument>.Filter.Eq("_id", oid)).FirstOrDefault();
            if (byOid is not null) {
                return byOid;
            }
        }

        return collection.Find(Builders<BsonDocument>.Filter.Eq("_id", id)).FirstOrDefault();
    }

    /// <summary>Id as it should be written/matched: ObjectId when the string parses as one.</summary>
    public static BsonValue ToIdValue(string id) =>
        ObjectId.TryParse(id, out var oid) ? oid : new BsonString(id);

    /// <summary>Filter that matches a foreign key stored either as ObjectId or as string.</summary>
    public static FilterDefinition<BsonDocument> IdEquals(string field, string id) =>
        Builders<BsonDocument>.Filter.In(field, new[] { ToIdValue(id), new BsonString(id) });

    public static BsonElement? FindElement(BsonDocument doc, string key) {
        if (doc.TryGetElement(key, out var direct)) {
            return direct;
        }

        foreach (var element in doc.Elements) {
            if (string.Equals(element.Name, key, StringComparison.OrdinalIgnoreCase)) {
                return element;
            }
        }

        return null;
    }

    /// <summary>The value for <paramref name="key"/>, or null when missing or BSON null.</summary>
    public static BsonValue? ReadValue(BsonDocument doc, string key) {
        var element = FindElement(doc, key);
        return element is null || element.Value.Value.IsBsonNull ? null : element.Value.Value;
    }

    /// <summary>First non-empty string among <paramref name="keys"/>, trimmed.</summary>
    public static string? ReadString(BsonDocument doc, params string[] keys) {
        foreach (var key in keys) {
            var text = ReadValue(doc, key) switch {
                null => null,
                BsonString s => s.Value,
                BsonObjectId oid => oid.Value.ToString(),
                BsonDateTime dt => dt.ToUniversalTime().ToString("o"),
                BsonBoolean b => b.Value ? "true" : "false",
                var other => other.ToString(),
            };
            if (!string.IsNullOrWhiteSpace(text)) {
                return text.Trim();
            }
        }

        return null;
    }

    /// <summary>First non-empty id among <paramref name="keys"/> as a string (ObjectId hex or raw string).</summary>
    public static string? ReadId(BsonDocument doc, params string[] keys) {
        foreach (var key in keys) {
            var raw = ReadValue(doc, key) switch {
                null => null,
                BsonObjectId oid => oid.Value.ToString(),
                BsonString s => s.Value.Trim(),
                var other => other.ToString()?.Trim(),
            };
            if (!string.IsNullOrWhiteSpace(raw) && raw != "null") {
                return raw;
            }
        }

        return null;
    }

    public static bool ReadBool(BsonDocument doc, string key, bool fallback = false) {
        var value = ReadValue(doc, key);
        return value is null ? fallback : ToBool(value);
    }

    public static int ReadInt(BsonDocument doc, string key, int fallback = 0) =>
        ReadValue(doc, key) switch {
            BsonInt32 i => i.Value,
            BsonInt64 l => (int)l.Value,
            BsonDouble d => (int)d.Value,
            BsonDecimal128 m => (int)Decimal128.ToDecimal(m.Value),
            BsonString s when int.TryParse(s.Value.Trim(), out var n) => n,
            _ => fallback,
        };

    public static decimal ReadDecimal(BsonDocument doc, string key, decimal fallback = 0m) =>
        ReadValue(doc, key) switch {
            BsonDecimal128 m => Decimal128.ToDecimal(m.Value),
            BsonDouble d => (decimal)d.Value,
            BsonInt32 i => i.Value,
            BsonInt64 l => l.Value,
            BsonString s when decimal.TryParse(s.Value.Trim(), out var n) => n,
            _ => fallback,
        };

    public static bool IsDeleted(BsonDocument doc) => ReadBool(doc, "IsDeleted");

    public static bool ToBool(BsonValue value) => value switch {
        BsonBoolean b => b.Value,
        BsonInt32 i => i.Value != 0,
        BsonInt64 l => l.Value != 0,
        BsonDouble d => d.Value != 0,
        BsonString s => s.Value.Trim().Equals("true", StringComparison.OrdinalIgnoreCase)
                        || s.Value.Trim().Equals("yes", StringComparison.OrdinalIgnoreCase)
                        || s.Value.Trim() == "1",
        _ => false,
    };
}
