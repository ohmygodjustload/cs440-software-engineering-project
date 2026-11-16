using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public sealed class InMemoryAppointmentAuditStore : IAppointmentAuditStore
{
    private readonly ConcurrentQueue<AppointmentAuditEntry> _entries = new();

    public void Add(AppointmentAuditEntry entry)
    {
        if (string.IsNullOrWhiteSpace(entry.Id))
            entry.Id = Guid.NewGuid().ToString("N");
        if (entry.Timestamp == default)
            entry.Timestamp = DateTimeOffset.UtcNow;

        _entries.Enqueue(entry);
        while (_entries.Count > 1000)
            _entries.TryDequeue(out _);
    }

    public IReadOnlyList<AppointmentAuditEntry> Query(
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        string? action = null,
        int limit = 200)
    {
        IEnumerable<AppointmentAuditEntry> query = _entries;
        if (from.HasValue)
            query = query.Where(e => e.Timestamp >= from.Value);
        if (to.HasValue)
            query = query.Where(e => e.Timestamp < to.Value);
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(e => string.Equals(e.Action, action.Trim(), StringComparison.OrdinalIgnoreCase));

        return query
            .OrderByDescending(e => e.Timestamp)
            .ThenByDescending(e => e.Id, StringComparer.Ordinal)
            .Take(Math.Clamp(limit, 1, 500))
            .ToList();
    }
}
