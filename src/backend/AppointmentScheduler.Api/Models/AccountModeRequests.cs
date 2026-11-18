using System.ComponentModel.DataAnnotations;
namespace AppointmentScheduler.Api.Models;

public sealed class AddProviderRoleRequest
{
    [Required, MinLength(1), MaxLength(3)]
    public List<AppointmentCategory> ServiceTypes { get; set; } = [];
    public ServiceCredentialRequest? MedicalCredentials { get; set; }
    public ServiceCredentialRequest? BeautyCredentials { get; set; }
    public ServiceCredentialRequest? FitnessCredentials { get; set; }
}

public sealed record AccountModeStatus(User User, ProviderApplicationStatus? Application);
public sealed record ProviderApplicationStatus(string Id, string Status, string Notes, DateTimeOffset SubmittedAt);
