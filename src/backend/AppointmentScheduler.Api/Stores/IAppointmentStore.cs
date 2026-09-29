using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Storage abstraction for appointments. The in-memory implementation below
/// lets the frontend integrate today; swap it for a MongoDB implementation
/// later without touching controllers.
/// </summary>
public interface IAppointmentStore
{
    IReadOnlyList<Appointment> GetAll();
    Appointment? GetById(string id);
    Appointment Add(Appointment appointment);
    bool Update(Appointment appointment);
    bool Remove(string id);
}
