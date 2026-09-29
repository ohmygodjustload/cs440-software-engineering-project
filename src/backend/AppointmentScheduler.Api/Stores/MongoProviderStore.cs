using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>MongoDB-backed provider store. Same interface the controllers already use.</summary>
public sealed class MongoProviderStore : IProviderStore
{
    private readonly IMongoCollection<Provider> _collection;

    public MongoProviderStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _collection = context.Database.GetCollection<Provider>(options.Value.ProvidersCollection);
    }

    public IReadOnlyList<Provider> GetAll() =>
        _collection.Find(FilterDefinition<Provider>.Empty).SortBy(p => p.Name).ToList();

    public Provider? GetById(string id) =>
        _collection.Find(p => p.Id == id).FirstOrDefault();

    public Provider Add(Provider provider)
    {
        if (string.IsNullOrWhiteSpace(provider.Id))
        {
            provider.Id = Guid.NewGuid().ToString("N");
        }

        _collection.InsertOne(provider);
        return provider;
    }

    public bool Remove(string id)
    {
        var result = _collection.DeleteOne(p => p.Id == id);
        return result.DeletedCount > 0;
    }
}
