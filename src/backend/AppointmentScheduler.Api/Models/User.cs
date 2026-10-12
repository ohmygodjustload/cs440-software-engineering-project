using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
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

    [MaxLength(320)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    public bool IsClient { get; set; }

    public bool IsServiceProvider { get; set; }

    public bool IsAdmin { get; set; }

    public bool IsActive { get; set; } = true;

    public List<AppointmentCategory> ServiceTypes { get; set; } = [];

    public ServiceCredential? MedicalCredentials { get; set; }

    public ServiceCredential? BeautyCredentials { get; set; }

    public ServiceCredential? FitnessCredentials { get; set; }

    [JsonIgnore]
    [BsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;
}

public sealed class ServiceCredential
{
    public string? Qualification { get; set; }

    public string? Institution { get; set; }

    public string? LicenseNumber { get; set; }

    public string? Specialties { get; set; }
}
