using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Thread-safe in-memory store. Replaced by MongoDB when it is wired up.</summary>
public sealed class InMemoryAppointmentStore : IAppointmentStore {
    private readonly ConcurrentDictionary<string, Appointment> _items = new();
    private readonly Lock _slotGate = new();

    public IReadOnlyList<Appointment> GetAll() =>
        [.. _items.Values.Where(a => !a.IsDeleted).OrderBy(a => a.StartDateTime)];

    public Appointment? GetById(string id) =>
        _items.TryGetValue(id, out var a) && !a.IsDeleted ? a : null;

    public Appointment AddSlot(Appointment slot) => Add(slot);

    public Appointment Add(Appointment appointment) {
        if (string.IsNullOrWhiteSpace(appointment.Id)) {
            appointment.Id = Guid.NewGuid().ToString("N");
        }

        _items[appointment.Id] = appointment;
        return appointment;
    }

    public bool UpdateSlot(Appointment slot) {
        if (!_items.TryGetValue(slot.Id, out var cur) || cur.IsDeleted ||
            cur.Status != AppointmentStatus.Available) return false;
        _items[slot.Id] = slot;
        return true;
    }

    public bool Update(Appointment appointment) {
        if (!_items.ContainsKey(appointment.Id)) {
            return false;
        }

        _items[appointment.Id] = appointment;
        return true;
    }

    public bool SoftDeleteSlot(string id) {
        if (!_items.TryGetValue(id, out var cur) || cur.IsDeleted ||
            cur.Status != AppointmentStatus.Available) return false;
        cur.IsDeleted = true;
        cur.DeletedAt = DateTimeOffset.UtcNow;
        return true;
    }

    public bool BookSlot(string id, string clientId, string notes) {
        lock (_slotGate) {
            if (!_items.TryGetValue(id, out var cur) || cur.IsDeleted ||
                cur.Status != AppointmentStatus.Available || cur.UserId is not null) return false;
            cur.UserId = clientId;
            cur.Status = AppointmentStatus.Booked;
            cur.Notes = notes;
            return true;
        }
    }

    public bool Remove(string id) => _items.TryRemove(id, out _);
}
