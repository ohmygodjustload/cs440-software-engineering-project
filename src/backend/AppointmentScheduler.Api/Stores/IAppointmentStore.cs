using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Storage abstraction for appointments. The in-memory implementation below
/// lets the frontend integrate today; swap it for a MongoDB implementation
/// later without touching controllers.
/// </summary>
public interface IAppointmentStore {
    IReadOnlyList<Appointment> GetAll();
    Appointment? GetById(string id);
    Appointment Add(Appointment appointment);
    bool Update(Appointment appointment);
    bool Remove(string id);
    Appointment AddSlot(Appointment slot);
    bool UpdateSlot(Appointment slot);
    bool SoftDeleteSlot(string id);

    /// <summary>One conditional write: succeeds only while the slot is Available, has no client, and is not deleted.</summary>
    bool BookSlot(string id, string clientId, string notes);
}
