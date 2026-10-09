using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>An audit log for what changes have been made to appointments. </summary>
public sealed class AppointmentAuditLog
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public ObjectId AppointmentId { get; set; }
    
    public ObjectId ChangedByUserId { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset Timestamp { get; set; } = DateTime.UtcNow;
    
    public string Action { get; set; } = string.Empty;// Event identifiers: "CREATED", "RESCHEDULED", "STATUS_CHANGE", "CANCELLED"
    
    public ObjectId OldStatusId { get; set; }
    
    public ObjectId NewStatusId { get; set; }
}
