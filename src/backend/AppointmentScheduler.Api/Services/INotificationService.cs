using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Services;

/// <summary>
/// Turns appointment/slot lifecycle events into persisted account notifications.
/// Each method only creates a notification when the target account has that
/// category enabled (see <see cref="ShouldNotifyForCategory"/>).
/// </summary>
public interface INotificationService
{
    /// <summary>The signed-in user (client or provider) created an appointment or slot.</summary>
    void OnAppointmentCreated(string userId, string appointmentId, AppointmentCategory category, string title);

    /// <summary>A service provider published a new available appointment slot.</summary>
    void OnSlotCreated(string providerId, string slotId, AppointmentCategory category, string title);

    /// <summary>A client booked an open provider slot.</summary>
    void OnAppointmentBooked(string clientId, string providerId, string appointmentId, AppointmentCategory category, string title, string? clientName = null);

    /// <summary>An appointment or slot was cancelled with a reason.</summary>
    void OnAppointmentCancelled(string clientId, string providerId, string appointmentId, AppointmentCategory category, string title, string reason);

    int GetUnreadCount(string userId);
}
