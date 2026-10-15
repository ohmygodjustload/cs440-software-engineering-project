using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

public sealed class CreateSlotDto {
    [Required] public string? AppointmentTypeId { get; set; }
    [Required] public DateTimeOffset? StartTime { get; set; }
}

public sealed class UpdateSlotDto {
    public string? AppointmentTypeId { get; set; }
    public DateTimeOffset? StartTime { get; set; }
}
