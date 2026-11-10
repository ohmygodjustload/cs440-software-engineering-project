using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Stored appointment. This is also the response shape returned by the API
/// so the frontend has a single contract to code against.
/// Times are stored as <see cref="DateTimeOffset"/> and should be UTC.
/// </summary>
public sealed class Appointment {
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string Title { get; set; } = string.Empty;

    public AppointmentCategory Category { get; set; }

    public DateTimeOffset StartDateTime { get; set; }

    public DateTimeOffset EndDateTime { get; set; }

    public string ProviderId { get; set; } = string.Empty;

    public string? ProviderName { get; set; }

    public string? UserId { get; set; }

    public string? AppointmentTypeId { get; set; }

    public string? Location { get; set; }

    public string? Notes { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Booked;

    [System.Text.Json.Serialization.JsonIgnore]
    public bool IsDeleted { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public DateTimeOffset? DeletedAt { get; set; }
}
