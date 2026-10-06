using System.ComponentModel.DataAnnotations;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Models;

/// <summary>Body for <c>POST /api/appointments</c>.</summary>
public sealed class CreateAppointmentDto
{
    [Required, MinLength(1), MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public AppointmentCategory? Category { get; set; }

    [Required]
    public DateTimeOffset? StartDateTime { get; set; }

    [Required]
    public DateTimeOffset? EndDateTime { get; set; }

    [Required, MinLength(1), MaxLength(100)]
    public string ProviderId { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ProviderName { get; set; }

    [MaxLength(100)]
    public string? UserId { get; set; }

    [MaxLength(300)]
    public string? Location { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
