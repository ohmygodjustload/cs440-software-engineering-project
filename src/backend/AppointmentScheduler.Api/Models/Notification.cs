using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;



namespace AppointmentScheduler.Api.Models;

/// <summary>
/// One stored account notification. Delivered in-browser only (email is out of scope).
/// Stored in the BAAAM.Notification collection; every query enforces IsDeleted == false.
/// </summary>
public sealed class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>The account (client or provider) that owns this notification.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Machine-readable event kind, e.g. "appointment-created".</summary>
    public string Event { get; set; } = string.Empty;

    /// <summary>Human-readable label, e.g. "Appointment created".</summary>
    public string EventLabel { get; set; } = string.Empty;

    /// <summary>Summary of the event, e.g. the appointment title.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Related appointment when known (deep-linking only).</summary>
    public string? AppointmentId { get; set; }

    /// <summary>Category this notification is scoped to, when applicable.</summary>
    public AppointmentCategory? Category { get; set; }

    /// <summary>The cancellation reason, for cancelled notifications.</summary>
    public string? Reason { get; set; }

    /// <summary>Read state as recorded by the backend.</summary>
    public bool IsRead { get; set; }

    /// <summary>When the notification was recorded (UTC).</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    [BsonIgnore]
    public bool IsDeleted { get; set; }

    [JsonIgnore]
    [BsonIgnore]
    public DateTimeOffset? DeletedAt { get; set; }
}
