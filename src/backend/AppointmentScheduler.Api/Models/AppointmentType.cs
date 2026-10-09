using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>A type of appointment.</summary>
public sealed class AppointmentType
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    
    public ObjectId ProviderId { get; set; }
    
    public string CustomServiceName { get; set; }
    
    public int DurationInMinutes { get; set; }
    
    public decimal Price { get; set; }
    
    public ObjectId LocationId { get; set; }
    
    public string Contact { get; set; }
    
    public bool IsBeauty { get; set; }
    
    public bool IsMedical { get; set; }
    
    public bool IsFitness { get; set; }
    
    public bool IsDeleted {get; set; } = false; 
    
    public DateTimeOffset DeletedAt { get; set; }

}
