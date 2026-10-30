using System.Collections.Concurrent;
using System.Threading;

using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Thread-safe in-memory store for local development. Replaced by MongoDB when it is wired up.</summary>
public sealed class InMemoryNotificationStore : INotificationStore
{
    private readonly ConcurrentDictionary<string, Notification> _items = new();
    private readonly Lock _gate = new();

    public IReadOnlyList<Notification> GetAll(string userId) =>
        _items.Values.Where(n => !n.IsDeleted && n.UserId == userId).OrderByDescending(n => n.CreatedAt).ToList();

    public Notification? GetById(string id) =>
        _items.TryGetValue(id, out var notification) && !notification.IsDeleted ? notification : null;

    public Notification Add(Notification notification)
    {
        if (string.IsNullOrWhiteSpace(notification.Id)) notification.Id = Guid.NewGuid().ToString("N");
        _items[notification.Id] = notification;
        return notification;
    }

    public bool Update(Notification notification)
    {
        if (!_items.TryGetValue(notification.Id, out var existing) || existing.IsDeleted) return false;
        _items[notification.Id] = notification;
        return true;
    }

    public bool MarkRead(string id)
    {
        if (!_items.TryGetValue(id, out var notification) || notification.IsDeleted) return false;
        notification.IsRead = true;
        return true;
    }

    public bool MarkAllRead(string userId)
    {
        var changed = false;
        lock (_gate)
        {
            foreach (var notification in _items.Values.Where(n => n.UserId == userId && !n.IsDeleted && !n.IsRead))
            {
                notification.IsRead = true;
                changed = true;
            }
        }

        return changed;
    }

    public int GetUnreadCount(string userId) => _items.Values.Count(n => n.UserId == userId && !n.IsDeleted && !n.IsRead);
}
