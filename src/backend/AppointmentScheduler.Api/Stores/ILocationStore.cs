using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public interface ILocationStore {
    Location? GetById(string id);
}
