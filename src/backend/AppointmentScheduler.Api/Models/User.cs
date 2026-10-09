using System.ComponentModel.DataAnnotations;
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

    public bool IsClient { get; set; }

    public bool IsProvider { get; set; }

    public bool IsAdmin { get; set; }

    public bool IsActive { get; set; }

    public bool IsDeleted { get; set; }

    public DateTimeOffset DeletedAt { get; set; }
}
