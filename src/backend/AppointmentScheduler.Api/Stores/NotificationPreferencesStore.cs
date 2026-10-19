using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Persistence boundary for per-user notification preferences and notification
/// history. Lives in sibling documents/collections keyed on the owning user id,
/// so the BAAAM.User collection stays the authoritative account record while
/// settings and notifications stay unique to each account (see
/// docs/DB_Cheatsheet.md). When a Mongo connection string is set, this uses the
/// existing database context; otherwise it is a no-op except for the in-memory
/// fallback below.
/// </summary>
public sealed class NotificationPreferencesStore : INotificationPreferencesStore
{
    private readonly IMongoCollection<BsonDocument> _preferences;
    private readonly IMongoCollection<BsonDocument> _history;

    public NotificationPreferencesStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        var db = context.Database;
        _preferences = db.GetCollection<BsonDocument>(options.Value.NotificationPreferencesCollection);
        _history = db.GetCollection<BsonDocument>(options.Value.NotificationHistoryCollection);
    }

    public NotificationPreferences? GetByUserId(string userId)
    {
        var doc = _preferences.Find(Builders<BsonDocument>.Filter.Eq("UserId", userId)).FirstOrDefault();
        return doc is null ? null : MapPreferences(doc);
    }

    public NotificationPreferences UpsertByUserId(string userId, NotificationPreferences existing)
    {
        var builder = Builders<BsonDocument>.Filter;
        var filter = builder.Eq("UserId", userId);
        var update = Builders<BsonDocument>.Update
            .SetOnInsert("UserId", userId)
            .SetOnInsert("CreatedAt", new BsonDateTime(DateTimeOffset.UtcNow.UtcDateTime))
            .Set("InBrowserEnabled", existing.InBrowserEnabled)
            .Set("ReminderDayBeforeEnabled", existing.ReminderDayBeforeEnabled)
            .Set("ReminderHourBeforeEnabled", existing.ReminderHourBeforeEnabled)
            .Set("UpdatedAt", new BsonDateTime(DateTimeOffset.UtcNow.UtcDateTime));

        _preferences.UpdateOne(filter, update, new UpdateOptions { IsUpsert = true });
        return MapPreferences(_preferences.Find(filter).FirstOrDefault()
            ?? throw new InvalidOperationException("Upserted preference was not found."));
    }

    private static NotificationPreferences MapPreferences(BsonDocument doc)
    {
        return new NotificationPreferences
        {
            Id = BsonHelpers.ReadId(doc, "_id", "Id"),
            UserId = BsonHelpers.ReadString(doc, "UserId"),
            InBrowserEnabled = BsonHelpers.ReadBool(doc, "InBrowserEnabled"),
            ReminderDayBeforeEnabled = BsonHelpers.ReadBool(doc, "ReminderDayBeforeEnabled"),
            ReminderHourBeforeEnabled = BsonHelpers.ReadBool(doc, "ReminderHourBeforeEnabled"),
            CreatedAt = BsonHelpers.ReadDateTime(doc, "CreatedAt", DateTimeOffset.UtcNow),
            UpdatedAt = BsonHelpers.ReadDateTimeNullable(doc, "UpdatedAt")
        };
    }

    public AppNotification? AddToHistory(string userId, string eventKind, string eventLabel, string message, string? appointmentId = null)
    {
        var doc = new BsonDocument
        {
            ["UserId"] = userId,
            ["Event"] = eventKind,
            ["EventLabel"] = eventLabel,
            ["Message"] = message,
            ["AppointmentId"] = BsonValue.Create(appointmentId),
            ["CreatedAt"] = new BsonDateTime(DateTimeOffset.UtcNow.UtcDateTime),
            ["IsRead"] = false
        };
        _history.InsertOne(doc);
        return MapHistory(doc);
    }

    public bool MarkAllRead(string userId)
    {
        var result = _history.UpdateMany(
            Builders<BsonDocument>.Filter.Eq("UserId", userId) & Builders<BsonDocument>.Filter.Eq("IsRead", false),
            Builders<BsonDocument>.Update.Set("IsRead", true));
        return result.ModifiedCount > 0;
    }


    public IEnumerable<AppNotification> GetHistoryForUser(string userId)
    {
        var docs = _history.Find(Builders<BsonDocument>.Filter.Eq("UserId", userId))
            .SortByDescending(d => d["CreatedAt"])
            .ToList();
        return docs.Select(MapHistory).ToList();
    }

    private static AppNotification? MapHistory(BsonDocument doc)
    {
        return new AppNotification
        {
            Id = BsonHelpers.ReadId(doc, "_id", "Id"),
            UserId = BsonHelpers.ReadString(doc, "UserId"),
            Event = Enum.TryParse<NotificationEventKind>(BsonHelpers.ReadString(doc, "Event", "appointment-created"), true, out var kind) ? kind : NotificationEventKind.AppointmentCreated,
            EventLabel = BsonHelpers.ReadString(doc, "EventLabel"),
            Message = BsonHelpers.ReadString(doc, "Message"),
            AppointmentId = BsonHelpers.ReadString(doc, "AppointmentId"),
            CreatedAt = BsonHelpers.ReadDateTime(doc, "CreatedAt", DateTimeOffset.UtcNow),
            IsRead = BsonHelpers.ReadBool(doc, "IsRead")
        };
    }
}
