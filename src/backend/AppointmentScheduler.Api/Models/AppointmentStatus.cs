namespace AppointmentScheduler.Api.Models;

/// <summary>Simple lifecycle status for an appointment.</summary>
public enum AppointmentStatus
{
    Scheduled = 0,
    Cancelled = 1,
    Completed = 2
}
