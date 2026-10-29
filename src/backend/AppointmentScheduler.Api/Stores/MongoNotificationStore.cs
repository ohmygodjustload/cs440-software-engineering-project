using System.Collections.Generic;
using System.Linq;
using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads and writes notifications in the BAAAM.Notification collection.
/// All queries enforce IsDeleted == false, consistent with the DB cheatsheet.
/// </summary>
public sealed class MongoNotificationStore : INotificationStore
{
    private readonly IMongoCollection<BsonDocument> _raw;

    public MongoNotificationStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _raw = context.Database.GetCollection<BsonDocument>(options.Value.NotificationsCollection);
    }

    public IReadOnlyList<Notification> GetAll(string userId)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("UserId", userId) & Builders<BsonDocument>.Filter.Eq("IsDeleted", false);
        return _raw.Find(filter).ToList().Select(Map).OrderByDescending(n => n.CreatedAt).ToList();
    }

    public Notification? GetById(string id)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("_id", id) & Builders<BsonDocument>.Filter.Eq("IsDeleted", false);
        var doc = _raw.Find(filter).FirstOrDefault();
        return doc is null ? null : Map(doc);
    }

    public Notification Add(Notification notification)
    {
        var doc = new BsonDocument
        {
            { "_id", notification.Id },
            { "UserId", notification.UserId },
            { "Event", notification.Event },
            { "EventLabel", notification.EventLabel },
            { "Message", notification.Message },
            { "AppointmentId", notification.AppointmentId is null ? BsonNull.Value : notification.AppointmentId },
            { "Category", notification.Category.HasValue ? notification.Category.Value.ToString() : BsonNull.Value },
            { "Reason", notification.Reason is null ? BsonNull.Value : notification.Reason },
            { "IsRead", notification.IsRead },
            { "CreatedAt", notification.CreatedAt.UtcDateTime },
            { "IsDeleted", notification.IsDeleted },
            { "DeletedAt", notification.DeletedAt.HasValue ? new BsonDateTime(notification.DeletedAt.Value.UtcDateTime) : BsonNull.Value }
        };
        _raw.InsertOne(doc);
        return notification;
    }

    public bool Update(Notification notification)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("_id", notification.Id) & Builders<BsonDocument>.Filter.Eq("IsDeleted", false);
        var replacement = new BsonDocument
        {
            { "_id", notification.Id },
            { "UserId", notification.UserId },
            { "Event", notification.Event },
            { "EventLabel", notification.EventLabel },
            { "Message", notification.Message },
            { "AppointmentId", notification.AppointmentId is null ? BsonNull.Value : notification.AppointmentId },
            { "Category", notification.Category.HasValue ? notification.Category.Value.ToString() : BsonNull.Value },
            { "Reason", notification.Reason is null ? BsonNull.Value : notification.Reason },
            { "IsRead", notification.IsRead },
            { "CreatedAt", notification.CreatedAt.UtcDateTime },
            { "IsDeleted", notification.IsDeleted },
            { "DeletedAt", notification.DeletedAt.HasValue ? new BsonDateTime(notification.DeletedAt.Value.UtcDateTime) : BsonNull.Value }
        };
        var result = _raw.ReplaceOne(filter, replacement);
        return result.MatchedCount > 0;
    }

    public bool MarkRead(string id)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("_id", id) & Builders<BsonDocument>.Filter.Eq("IsDeleted", false) & Builders<BsonDocument>.Filter.Eq("IsRead", false);
        var result = _raw.UpdateOne(filter, Builders<BsonDocument>.Update.Set("IsRead", true));
        return result.MatchedCount > 0;
    }

    public bool MarkAllRead(string userId)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("UserId", userId) & Builders<BsonDocument>.Filter.Eq("IsDeleted", false) & Builders<BsonDocument>.Filter.Eq("IsRead", false);
        var result = _raw.UpdateMany(filter, Builders<BsonDocument>.Update.Set("IsRead", true));
        return result.MatchedCount > 0;
    }

    public int GetUnreadCount(string userId)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("UserId", userId) & Builders<BsonDocument>.Filter.Eq("IsDeleted", false) & Builders<BsonDocument>.Filter.Eq("IsRead", false);
        return (int)_raw.CountDocuments(filter);
    }

    private static Notification Map(BsonDocument doc)
    {
        return new Notification
        {
            Id = ReadId(doc, "_id") ?? string.Empty,
            UserId = ReadString(doc, "UserId") ?? string.Empty,
            Event = ReadString(doc, "Event") ?? string.Empty,
            EventLabel = ReadString(doc, "EventLabel") ?? string.Empty,
            Message = ReadString(doc, "Message") ?? string.Empty,
            AppointmentId = ReadString(doc, "AppointmentId"),
            Category = ReadCategory(doc, "Category"),
            Reason = ReadString(doc, "Reason"),
            IsRead = ReadBool(doc, "IsRead", fallback: false),
            CreatedAt = ReadDate(doc, "CreatedAt") ?? DateTimeOffset.UtcNow,
            IsDeleted = ReadBool(doc, "IsDeleted", fallback: false),
            DeletedAt = ReadDate(doc, "DeletedAt"),
        };
    }

    private static AppointmentCategory? ReadCategory(BsonDocument doc, string key)
    {
        var value = ReadString(doc, key);
        if (value is null) return null;
        return Enum.TryParse<AppointmentCategory>(value, true, out var category) ? category : null;
    }

    private static string? ReadString(BsonDocument doc, string key) =>
        doc.TryGetValue(key, out var value) ? ReadStringValue(value) : null;

    private static string ReadStringValue(BsonValue value) => value switch
    {
        BsonString s => s.AsString,
        BsonObjectId oid => oid.Value.ToString(),
        BsonDateTime dt => dt.ToUniversalTime().ToString("o"),
        BsonBoolean b => b.Value ? "true" : "false",
        _ => value.ToString()
    };

    private static string? ReadId(BsonDocument doc, string key) =>
        doc.TryGetValue(key, out var value) ? ReadIdValue(value) : null;

    private static string ReadIdValue(BsonValue value) => value switch
    {
        BsonObjectId oid => oid.Value.ToString(),
        BsonString s => s.AsString.Trim(),
        _ => value.ToString() ?? string.Empty
    };

    private static DateTimeOffset? ReadDate(BsonDocument doc, string key)
    {
        if (!doc.TryGetValue(key, out var value) || value is BsonNull) return null;
        if (value is BsonDateTime dt)
        {
            return new DateTimeOffset(dt.ToUniversalTime(), TimeSpan.Zero);
        }

        if (value is BsonString s && DateTimeOffset.TryParse(s.AsString, out var parsed))
        {
            return parsed.ToUniversalTime();
        }

        return DateTimeOffset.UtcNow;
    }

    private static bool ReadBool(BsonDocument doc, string key, bool fallback)
    {
        return doc.TryGetValue(key, out var value) && value is BsonBoolean b ? b.Value : fallback;
    }
}

