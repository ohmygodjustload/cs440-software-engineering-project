using System.ComponentModel.DataAnnotations;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Models;

/// <summary>Body for <c>PUT /api/appointments/{id}</c>. All fields are optional except validation of dates.</summary>
public sealed class UpdateAppointmentDto
{
    [MinLength(1), MaxLength(200)]
    public string? Title { get; set; }

    public AppointmentCategory? Category { get; set; }

    public DateTimeOffset? Start { get; set; }

    public DateTimeOffset? End { get; set; }

    [MaxLength(100)]
    public string? ProviderId { get; set; }

    [MaxLength(200)]
    public string? ProviderName { get; set; }

    [MaxLength(300)]
    public string? Location { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    public AppointmentStatus? Status { get; set; }
}
