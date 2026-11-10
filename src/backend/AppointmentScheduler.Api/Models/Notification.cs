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

    public string UserId { get; set; } = string.Empty;

    public string Event { get; set; } = string.Empty;

    public string EventLabel { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string? AppointmentId { get; set; }

    public AppointmentCategory? Category { get; set; }

    public string? Reason { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    [BsonIgnore]
    public bool IsDeleted { get; set; }

    [JsonIgnore]
    [BsonIgnore]
    public DateTimeOffset? DeletedAt { get; set; }
}
