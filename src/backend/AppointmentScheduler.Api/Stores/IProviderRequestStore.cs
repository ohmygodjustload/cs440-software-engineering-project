using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Storage abstraction for provider approval requests (BAAAM.ProviderRequest).</summary>
public interface IProviderRequestStore
{
    IReadOnlyList<ProviderRequest> GetAll();
    ProviderRequest? GetById(string id);

    /// <summary>Returns the most recently submitted request for a user, or null when none exists.</summary>
    ProviderRequest? GetLatestByUserId(string userId);

    ProviderRequest Add(ProviderRequest request);
    bool Update(ProviderRequest request);
}