using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Machine-readable event kinds for account notifications.
/// </summary>
public enum NotificationEventKind
{
    AppointmentCreated,
    AppointmentBooked,
    AppointmentCancelled,
    MissedNotifications,
    AppointmentEdited,
    Reminder
}

/// <summary>
/// One entry in the authenticated user's recent-notification history.
/// Lives in a sibling document/collection keyed on the owning user id.
/// </summary>
public sealed class AppNotification
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [BsonRepresentation(BsonType.String)]
    public string UserId { get; set; } = string.Empty;

    public NotificationEventKind Event { get; set; }

    public string EventLabel { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string? AppointmentId { get; set; }

    public AppointmentCategory? Category { get; set; }

    public string? Reason { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Per-user notification preferences. Lives in a sibling document keyed on
/// the owning user id, so the BAAAM.User collection stays the authoritative
/// account record and notification choices are unique per account.
/// </summary>
public sealed class NotificationPreferences
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [BsonRepresentation(BsonType.String)]
    public string UserId { get; set; } = string.Empty;

    public bool InBrowserEnabled { get; set; } = true;

    public bool ReminderDayBeforeEnabled { get; set; } = true;

    public bool ReminderHourBeforeEnabled { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }
}

/// <summary>Partial patch used for immediate per-toggle persistence. Only keys present in the body are applied.</summary>
public sealed class NotificationPreferencesPatch
{
    public bool? InBrowserEnabled { get; set; }

    public bool? ReminderDayBeforeEnabled { get; set; }

    public bool? ReminderHourBeforeEnabled { get; set; }
}
