using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

public sealed class PublishSlotDto
{
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [Required] public AppointmentCategory? Category { get; set; }
    [Required] public DateTimeOffset? StartDateTime { get; set; }
    [Required, MaxLength(300)] public string Location { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Notes { get; set; }
}

public sealed class PublishSlotBatchDto
{
    [Required, MinLength(1), MaxLength(24)]
    public List<PublishSlotDto> Slots { get; set; } = [];
}
