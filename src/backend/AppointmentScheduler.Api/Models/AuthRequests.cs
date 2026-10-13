using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

public sealed class LoginRequest
{
    [Required, MinLength(3), MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, MinLength(1), MaxLength(200)]
    public string Password { get; set; } = string.Empty;
}

public class RegisterUserRequest
{
    [Required, MinLength(1), MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MinLength(1), MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, MinLength(3), MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(320), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [Required, MinLength(8), MaxLength(200)]
    public string Password { get; set; } = string.Empty;
}

public sealed class RegisterProviderRequest : RegisterUserRequest
{
    public List<AppointmentCategory> ServiceTypes { get; set; } = [];

    public ServiceCredentialRequest? MedicalCredentials { get; set; }

    public ServiceCredentialRequest? BeautyCredentials { get; set; }

    public ServiceCredentialRequest? FitnessCredentials { get; set; }
}

public sealed class ServiceCredentialRequest
{
    [MaxLength(500)]
    public string? Info { get; set; }
}
