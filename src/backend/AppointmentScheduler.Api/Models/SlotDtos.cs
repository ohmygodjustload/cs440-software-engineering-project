using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

public sealed class CreateSlotDto {
    [Required] public string? AppointmentTypeId { get; set; }
    [Required] public DateTimeOffset? StartTime { get; set; }
}

public sealed class UpdateSlotDto {
    public string? AppointmentTypeId { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    /// <summary>Required when the slot is already Booked; the UI confirms after a 409 warning.</summary>
    public bool Confirm { get; set; }
}

public sealed class ConfirmDto {
    public bool Confirm { get; set; }
}

public sealed class BookedSlotConflict {
    public string Message { get; set; } = string.Empty;
    public bool RequiresConfirm { get; set; } = true;
    public string? ClientName { get; set; }
    public DateTimeOffset StartDateTime { get; set; }
}

public sealed class BookSlotDto {
    [MaxLength(1000)] public string? Notes { get; set; }
}
