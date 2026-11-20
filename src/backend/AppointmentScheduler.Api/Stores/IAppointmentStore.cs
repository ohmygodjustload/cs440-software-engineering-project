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

    /// <summary>Cancels a Booked appointment owned by <paramref name="clientId"/>: the status becomes Canceled (not Available) and the client id is preserved so the appointment stays visible in live lists and the client calendar.</summary>
    bool ReleaseBooking(string id, string clientId);

    /// <summary>Moves a Booked appointment's times while keeping the same client.</summary>
    bool RescheduleBooked(string id, string clientId, DateTimeOffset start, DateTimeOffset end);

    /// <summary>
    /// Cancels a Booked appointment: the status becomes Canceled, the client is preserved, and the
    /// appointment is NOT soft-deleted so it remains visible in the client calendar and history.
    /// </summary>
    bool CancelBooked(string id);
    /// <summary>
    /// Returns all appointments, including soft-deleted ones, sorted by start time.
    /// Used by admin views that need to show historical/canceled appointments.
    /// </summary>
    IReadOnlyList<Appointment> GetAllIncludingDeleted();
}
