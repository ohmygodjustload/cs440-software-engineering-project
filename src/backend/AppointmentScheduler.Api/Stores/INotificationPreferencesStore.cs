using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Storage abstraction for per-user notification preferences and notification
/// history. The controller uses this boundary so the Mongo and in-memory
/// implementations stay interchangeable.
/// </summary>
public interface INotificationPreferencesStore
{
    /// <summary>Loads the preferences for a user, or null when none exist.</summary>
    NotificationPreferences? GetByUserId(string userId);

    /// <summary>Loads and persists preferences, creating them on first use.</summary>
    NotificationPreferences UpsertByUserId(string userId, NotificationPreferences existing);

    /// <summary>Loads the signed-in user's notification history, newest first.</summary>
    IEnumerable<AppNotification> GetHistoryForUser(string userId);

    /// <summary>Appends an event to the signed-in user's history and returns it.</summary>
    AppNotification? AddToHistory(string userId, string eventKind, string eventLabel, string message, string? appointmentId = null);

    /// <summary>Marks every unread notification for a user as read.</summary>
    bool MarkAllRead(string userId);
}
