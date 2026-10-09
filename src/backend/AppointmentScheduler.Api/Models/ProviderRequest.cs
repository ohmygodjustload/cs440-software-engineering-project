using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>Service provider request. </summary>
public sealed class ProviderRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public ObjectId ProviderId { get; set; }
   
    public bool IsApproved { get; set; }
   
    public string Notes { get; set; } = string.Empty;
   
    public bool IsDeleted {get; set; } = false; 
   
    public DateTimeOffset DeletedAt { get; set; }
}
