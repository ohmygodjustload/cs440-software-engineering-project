using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Thread-safe in-memory provider store with a few seed entries.</summary>
public sealed class InMemoryProviderStore : IProviderStore
{
    private readonly ConcurrentDictionary<string, Provider> _items = new();

    public InMemoryProviderStore()
    {
        Add(new Provider {  });
        Add(new Provider {  });
        Add(new Provider {  });
    }

    public IReadOnlyList<Provider> GetAll() =>
        _items.Values.OrderBy(p => p.UserId).ToList();

    public Provider? GetById(string id) =>
        _items.TryGetValue(id, out var item) ? item : null;

    public Provider Add(Provider provider)
    {
        if (string.IsNullOrWhiteSpace(provider.Id))
        {
            provider.Id = Guid.NewGuid().ToString("N");
        }

        _items[provider.Id] = provider;
        return provider;
    }

    public bool Remove(string id) => _items.TryRemove(id, out _);
}
