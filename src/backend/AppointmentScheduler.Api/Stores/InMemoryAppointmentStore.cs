using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Thread-safe in-memory store. Replaced by MongoDB when it is wired up.</summary>
public sealed class InMemoryAppointmentStore : IAppointmentStore
{
    private readonly ConcurrentDictionary<string, Appointment> _items = new();

    public IReadOnlyList<Appointment> GetAll() =>
        _items.Values.OrderBy(a => a.Start).ToList();

    public Appointment? GetById(string id) =>
        _items.TryGetValue(id, out var item) ? item : null;

    public Appointment Add(Appointment appointment)
    {
        if (string.IsNullOrWhiteSpace(appointment.Id))
        {
            appointment.Id = Guid.NewGuid().ToString("N");
        }

        _items[appointment.Id] = appointment;
        return appointment;
    }

    public bool Update(Appointment appointment)
    {
        if (!_items.ContainsKey(appointment.Id))
        {
            return false;
        }

        _items[appointment.Id] = appointment;
        return true;
    }

    public bool Remove(string id) => _items.TryRemove(id, out _);
}
