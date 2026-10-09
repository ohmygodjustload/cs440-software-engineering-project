using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Stored appointment. This is also the response shape returned by the API
/// so the frontend has a single contract to code against.
/// Times are stored as <see cref="DateTimeOffset"/> and should be UTC.
/// </summary>
public sealed class Appointment
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public ObjectId AppointmentTypeId { get; set; }

    /// <summary>Stored as BSON date (UTC) by the driver's DateTimeOffsetSerializer.</summary>
    public DateTimeOffset StartDateTime { get; set; }

    /// <summary>Stored as BSON date (UTC) by the driver's DateTimeOffsetSerializer.</summary>
    public DateTimeOffset EndDateTime { get; set; }

    /// <summary>Owner of the appointment. Used later for per-user filtering + auth.</summary>
    public string UserId { get; set; } = "demo-user";

    public string? Notes { get; set; } = string.Empty;

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;

    public bool IsDeleted {get; set; } = false; 
    
    public DateTimeOffset DeletedAt { get; set; }
}
