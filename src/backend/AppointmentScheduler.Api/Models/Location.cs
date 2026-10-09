using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary> A location (street, city, state, zip). </summary>
public sealed class Location
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string Street { get; set; }
    
    public string City { get; set; }
    
    public string State { get; set; }
    
    public int ZIP { get; set; }
    
    public bool IsDeleted {get; set; } = false; 
    
    public DateTimeOffset DeletedAt { get; set; }
}
