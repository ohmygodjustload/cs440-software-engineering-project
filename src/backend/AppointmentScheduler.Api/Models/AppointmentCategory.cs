namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Appointment categories supported by the scheduler.
/// Matches the product scope: medical, beauty, and fitness.
/// </summary>
public enum AppointmentCategory
{
    Medical = 0,
    Beauty = 1,
    Fitness = 2
}
