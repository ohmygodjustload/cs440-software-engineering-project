using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Storage abstraction for providers (scheduler dropdown data).</summary>
public interface IProviderStore
{
    IReadOnlyList<Provider> GetAll();
    Provider? GetById(string id);
    Provider Add(Provider provider);
    bool Remove(string id);
}
