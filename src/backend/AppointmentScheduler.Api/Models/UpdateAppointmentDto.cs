using System;
using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Body for appointment updates. Omitted fields retain their existing values.
/// </summary>
public sealed class UpdateAppointmentDto
{
    [MinLength(1), MaxLength(200)]
    public string? Title { get; set; }

    public AppointmentCategory? Category { get; set; }

    public DateTimeOffset? StartDateTime { get; set; }

    public DateTimeOffset? EndDateTime { get; set; }

    /// <summary>
    /// Browser/editor time zone, for example "America/Chicago".
    /// Used to format appointment times in activity messages.
    /// </summary>
    [MaxLength(100)]
    public string? TimeZoneId { get; set; }

    /// <summary>
    /// Legacy display field. Not used to construct activity messages.
    /// </summary>
    [MaxLength(50)]
    public string? StartDateTimeLocal { get; set; }

    /// <summary>
    /// Legacy display field. Not used to construct activity messages.
    /// </summary>
    [MaxLength(50)]
    public string? EndDateTimeLocal { get; set; }

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
