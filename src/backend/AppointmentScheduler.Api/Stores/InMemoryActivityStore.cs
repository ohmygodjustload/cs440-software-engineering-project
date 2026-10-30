using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public sealed class InMemoryActivityStore : IActivityStore
{
    private readonly ConcurrentQueue<ActivityEntry> _entries = new();

    public void Add(string action, string message, string? actorUserId = null, string? entityId = null)
    {
        _entries.Enqueue(new ActivityEntry
        {
            Action = action,
            Message = message,
            ActorUserId = actorUserId,
            EntityId = entityId
        });

        while (_entries.Count > 500)
        {
            _entries.TryDequeue(out _);
        }
    }

    public IReadOnlyList<ActivityEntry> GetAll(int limit = 200) =>
        _entries.OrderByDescending(entry => entry.Timestamp).Take(Math.Clamp(limit, 1, 500)).ToList();

    public void Clear()
    {
        while (_entries.TryDequeue(out _))
        {
        }
    }
}
