using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public sealed class InMemoryAppointmentTypeStore : IAppointmentTypeStore {
    private readonly Dictionary<string, AppointmentType> _items = new();

    public InMemoryAppointmentTypeStore() =>
        _items[SeedIds.Type] = new AppointmentType {
            Id = SeedIds.Type, ProviderId = SeedIds.ProviderUser, CustomServiceName = "General checkup",
            DurationInMinutes = 30, Price = 50m, LocationId = SeedIds.Location, IsMedical = true
        };

    public AppointmentType? GetById(string id) => _items.GetValueOrDefault(id);

    public IReadOnlyList<AppointmentType> GetByProviderId(string pid) =>
        _items.Values.Where(t => t.ProviderId == pid).ToList();
}
