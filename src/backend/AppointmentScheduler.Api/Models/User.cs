using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Public user shape mapped from the team BAAAM.User collection.
/// Password is NEVER returned by the API.
/// </summary>
public sealed class User
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [Required, MinLength(1), MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MinLength(1), MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, MinLength(1), MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(320)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    public bool IsClient { get; set; }

    public bool IsServiceProvider { get; set; }

    public bool IsAdmin { get; set; }

    public bool IsActive { get; set; } = true;

    public List<AppointmentCategory> ServiceTypes { get; set; } = [];

    public ServiceCredential? MedicalCredentials { get; set; }

    public ServiceCredential? BeautyCredentials { get; set; }

    public ServiceCredential? FitnessCredentials { get; set; }

    /// <summary>
    /// Per-user notification preferences. Not persisted to the BAAAM.User
    /// collection directly during local dev — governed by the in-memory or
    /// Mongo user store below (see NotificationPreferencesStore).
    /// </summary>
    [JsonIgnore]
    [BsonIgnore]
    public NotificationPreferences? NotificationPreferences { get; set; }

    [JsonIgnore]
    [BsonIgnore]
    public string? NotificationPreferencesId { get; set; }

    [JsonIgnore]
    [BsonIgnore]
    public string? PasswordHash { get; set; }
}

public sealed class ServiceCredential
{
    public string? Info { get; set; }
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

    /// <summary>In-browser confirmations for appointment create / edit / cancel.</summary>
    public bool InBrowserEnabled { get; set; } = true;

    /// <summary>Reminder shown one day before the appointment.</summary>
    public bool ReminderDayBeforeEnabled { get; set; } = true;

    /// <summary>Reminder shown one hour before the appointment.</summary>
    public bool ReminderHourBeforeEnabled { get; set; } = true;

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset? UpdatedAt { get; set; }
}

/// <summary>
/// Partial patch used for immediate per-toggle persistence. Only keys present
/// in the body are applied; keys omitted stay as they are.
/// </summary>
public sealed class NotificationPreferencesPatch
{
    public bool? InBrowserEnabled { get; set; }
    public bool? ReminderDayBeforeEnabled { get; set; }
    public bool? ReminderHourBeforeEnabled { get; set; }
}

/// <summary>
/// One entry in the authenticated user's recent-notification history.
/// </summary>
public sealed class AppNotification
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [BsonRepresentation(BsonType.String)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Structured event kind; drives the left-column label.</summary>
    public NotificationEventKind Event { get; set; }

    /// <summary>Human-readable event label, e.g. Appointment created.</summary>
    public string EventLabel { get; set; } = string.Empty;

    /// <summary>Appointment-related summary, e.g. Annual physical.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Related appointment id when known (used for future deep-links only).</summary>
    public string? AppointmentId { get; set; }

    /// <summary>When the backend recorded the notification (UTC ISO-8601).</summary>
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Read state as recorded by the backend.</summary>
    public bool IsRead { get; set; }
}

/// <summary>Machine-readable event kinds the history list can render.</summary>
public enum NotificationEventKind
{
    AppointmentCreated,
    AppointmentEdited,
    AppointmentCancelled,
    Reminder
}
