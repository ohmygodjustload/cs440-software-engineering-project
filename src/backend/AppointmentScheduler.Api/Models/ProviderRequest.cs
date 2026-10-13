using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// A service provider's application for approval, created when a provider registers.
/// Mirrors the BAAAM.ProviderRequest collection (see docs/DB_Cheatsheet.md) and adds
/// snapshot fields so the admin review screen can show the submitted name, categories,
/// and qualifications without joins.
/// </summary>
public sealed class ProviderRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>Identifier of the pending provider account this request belongs to.</summary>
    [Required, MinLength(1)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Snapshot of the applicant's full name at submission time.</summary>
    [Required, MinLength(1), MaxLength(200)]
    public string ProviderName { get; set; } = string.Empty;

    /// <summary>Snapshot of the service categories the applicant selected.</summary>
    public List<AppointmentCategory> ServiceTypes { get; set; } = [];

    public ServiceCredential? MedicalCredentials { get; set; }

    public ServiceCredential? BeautyCredentials { get; set; }

    public ServiceCredential? FitnessCredentials { get; set; }

    /// <summary>False while the request is still open / to be reviewed.</summary>
    public bool IsReviewed { get; set; }

    /// <summary>True when an admin approved the request. Only meaningful once <see cref="IsReviewed"/> is true.</summary>
    public bool IsApproved { get; set; }

    /// <summary>Optional admin note. Free-text comments default to "" per the DB baseline policy.</summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>When the provider submitted the request. Stored as UTC.</summary>
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>When an admin approved or rejected the request. Stored as UTC; null while open.</summary>
    public DateTimeOffset? ReviewedAt { get; set; }

    public bool IsDeleted { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }
}

/// <summary>Body for approving or rejecting a provider request. The note is optional.</summary>
public sealed class ProviderRequestDecisionDto
{
    [MaxLength(2000)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }
}