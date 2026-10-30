using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Storage abstraction for account notifications (BAAAM.Notification).
/// Reads are scoped to a single account; notifications are only ever created by the
/// controllers that orchestrate appointment/slot lifecycle events.
/// </summary>
public interface INotificationStore
{
    IReadOnlyList<Notification> GetAll(string userId);
    Notification? GetById(string id);
    Notification Add(Notification notification);
    bool Update(Notification notification);
    bool MarkRead(string id);
    bool MarkAllRead(string userId);
    int GetUnreadCount(string userId);
}
