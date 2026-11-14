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

    /// <summary>Updates notes on a Booked appointment owned by <paramref name="clientId"/>.</summary>
    bool UpdateBookedNotes(string id, string clientId, string notes);

    /// <summary>Returns a Booked appointment to Available (UserId null, Notes empty) for the given client.</summary>
    bool ReleaseBooking(string id, string clientId);

    /// <summary>Moves a Booked appointment's times while keeping the same client.</summary>
    bool RescheduleBooked(string id, string clientId, DateTimeOffset start, DateTimeOffset end);

    /// <summary>Sets a Booked appointment's status to Canceled.</summary>
    bool CancelBooked(string id);
}
