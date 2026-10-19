using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Thread-safe in-memory notification preferences + history store for
/// no-secret local dev. Mirrors <see cref="NotificationPreferencesStore"/>
/// (Mongo) semantics: prefs are keyed on owning user id with first-write
/// CreatedAt preserved, history is newest-first per user.
/// </summary>
public sealed class InMemoryNotificationPreferencesStore : INotificationPreferencesStore
{
    private readonly ConcurrentDictionary<string, NotificationPreferences> _prefs =
        new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, AppNotification> _history = new();

    public NotificationPreferences? GetByUserId(string userId) =>
        _prefs.TryGetValue(userId, out var prefs) ? Clone(prefs) : null;

    public NotificationPreferences UpsertByUserId(string userId, NotificationPreferences existing)
    {
        var clone = Clone(existing);
        if (string.IsNullOrWhiteSpace(clone.Id))
        {
            clone.Id = Guid.NewGuid().ToString("N");
        }

        clone.UserId = userId;

        clone = _prefs.AddOrUpdate(
            userId,
            addValueFactory: _ => clone,
            updateValueFactory: (_, old) =>
            {
                // Match Mongo SetOnInsert(CreatedAt): first write wins.
                clone.CreatedAt = old.CreatedAt;
                return clone;
            });

        return Clone(clone);
    }

    public IEnumerable<AppNotification> GetHistoryForUser(string userId) =>
        _history.Values
            .Where(n => string.Equals(n.UserId, userId, StringComparison.Ordinal))
            .OrderByDescending(n => n.CreatedAt)
            .Select(Clone)
            .ToList();

    public AppNotification? AddToHistory(string userId, string eventKind, string eventLabel, string message, string? appointmentId = null)
    {
        if (!Enum.TryParse<NotificationEventKind>(eventKind, ignoreCase: true, out var kind))
        {
            kind = NotificationEventKind.AppointmentCreated;
        }

        var notification = new AppNotification
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            Event = kind,
            EventLabel = eventLabel,
            Message = message,
            AppointmentId = appointmentId,
            CreatedAt = DateTimeOffset.UtcNow,
            IsRead = false,
        };

        _history[notification.Id] = notification;
        return Clone(notification);
    }

    public bool MarkAllRead(string userId)
    {
        var updated = false;
        foreach (var entry in _history.Values.Where(n =>
            string.Equals(n.UserId, userId, StringComparison.Ordinal) && !n.IsRead))
        {
            entry.IsRead = true;
            updated = true;
        }

        return updated;
    }

    private static NotificationPreferences Clone(NotificationPreferences source) => new()
    {
        Id = source.Id,
        UserId = source.UserId,
        InBrowserEnabled = source.InBrowserEnabled,
        ReminderDayBeforeEnabled = source.ReminderDayBeforeEnabled,
        ReminderHourBeforeEnabled = source.ReminderHourBeforeEnabled,
        CreatedAt = source.CreatedAt,
        UpdatedAt = source.UpdatedAt,
    };

    private static AppNotification Clone(AppNotification source) => new()
    {
        Id = source.Id,
        UserId = source.UserId,
        Event = source.Event,
        EventLabel = source.EventLabel,
        Message = source.Message,
        AppointmentId = source.AppointmentId,
        CreatedAt = source.CreatedAt,
        IsRead = source.IsRead,
    };
}
