using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public sealed class InMemoryLocationStore : ILocationStore {
    private readonly Dictionary<string, Location> _items = new();

    public InMemoryLocationStore() =>
        _items[SeedIds.Location] = new Location
            { Id = SeedIds.Location, Street = "1 Main St", City = "Chicago", State = "IL", Zip = 60601 };

    public Location? GetById(string id) => _items.GetValueOrDefault(id);
}
