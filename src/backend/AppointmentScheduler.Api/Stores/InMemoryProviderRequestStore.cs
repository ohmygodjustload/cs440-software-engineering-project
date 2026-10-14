using System.Collections.Concurrent;
using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Thread-safe in-memory provider request store for no-secret local dev.</summary>
public sealed class InMemoryProviderRequestStore : IProviderRequestStore
{
    private readonly ConcurrentDictionary<string, ProviderRequest> _items = new();

    public IReadOnlyList<ProviderRequest> GetAll() =>
        _items.Values
            .Where(r => !r.IsDeleted)
            .OrderByDescending(r => r.SubmittedAt)
            .ToList();

    public ProviderRequest? GetById(string id) =>
        _items.TryGetValue(id, out var item) && !item.IsDeleted ? item : null;

    public ProviderRequest? GetLatestByUserId(string userId) =>
        _items.Values
            .Where(r => !r.IsDeleted && string.Equals(r.UserId, userId, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(r => r.SubmittedAt)
            .FirstOrDefault();

    public ProviderRequest Add(ProviderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
        {
            request.Id = Guid.NewGuid().ToString("N");
        }

        request.Notes ??= string.Empty;
        _items[request.Id] = request;
        return request;
    }

    public bool Update(ProviderRequest request)
    {
        if (!_items.ContainsKey(request.Id))
        {
            return false;
        }

        _items[request.Id] = request;
        return true;
    }
}