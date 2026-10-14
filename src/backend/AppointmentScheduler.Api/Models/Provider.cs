using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>Service provider (doctor, stylist, trainer). Kept minimal for scheduler dropdowns.</summary>
public sealed class Provider
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [Required, MinLength(1), MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Specialty { get; set; }

    [MaxLength(320)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    /// <summary>
    /// True once an admin approved the provider. Slots from unapproved providers are hidden
    /// from clients and unapproved providers cannot create new appointments.
    /// </summary>
    public bool IsApproved { get; set; } = true;
}
