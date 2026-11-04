using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

public sealed class ActivityEntry
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActorUserId { get; set; }
    public string? EntityId { get; set; }
}
