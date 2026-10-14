using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public interface IAppointmentTypeStore {
    AppointmentType? GetById(string id);
    IReadOnlyList<AppointmentType> GetByProviderId(string providerId);
}
