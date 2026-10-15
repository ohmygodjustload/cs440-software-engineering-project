namespace AppointmentScheduler.Api.Models;

/// <summary>Simple lifecycle status for an appointment.</summary>
public enum AppointmentStatus {
    Available, Booked, Completed, Canceled, Missed
}
