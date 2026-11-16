using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

public sealed class UpdateNotesDto
{
    [MaxLength(1000)]
    public string? Notes { get; set; }
}
