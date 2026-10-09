using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads the team BAAAM.ServiceProvider collection (userId/locationId refs)
/// and maps it to the <see cref="Provider"/> API shape.
/// READ-ONLY for now: no inserts/deletes touch BAAAM data.
/// </summary>
public sealed class MongoProviderStore : IProviderStore
{
    private readonly IMongoDatabase _db;
    private readonly IMongoCollection<BsonDocument> _raw;

    public MongoProviderStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _db = context.Database;
        _raw = _db.GetCollection<BsonDocument>(options.Value.ProvidersCollection);
    }

    public IReadOnlyList<Provider> GetAll()
    {
        var users = _db.GetCollection<BsonDocument>("User")
            .Find(FilterDefinition<BsonDocument>.Empty).ToList()
            .ToDictionary(d => d["_id"].AsObjectId.ToString(), d => d);
        return _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Select(d => Map(d, users))
            .OrderBy(p => p.UserId)
            .ToList();
    }

    public Provider? GetById(string id)
    {
        if (!ObjectId.TryParse(id, out var oid))
        {
            return null;
        }

        var users = _db.GetCollection<BsonDocument>("User")
            .Find(FilterDefinition<BsonDocument>.Empty).ToList()
            .ToDictionary(d => d["_id"].AsObjectId.ToString(), d => d);
        var doc = _raw.Find(Builders<BsonDocument>.Filter.Eq("_id", oid)).FirstOrDefault();
        return doc is null ? null : Map(doc, users);
    }

    public Provider Add(Provider provider) =>
        throw new NotSupportedException("BAAAM.ServiceProvider is read-only from this API.");

    public bool Remove(string id) =>
        throw new NotSupportedException("BAAAM.ServiceProvider is read-only from this API.");

    private static Provider Map(BsonDocument d, Dictionary<string, BsonDocument> users)
    {
        return new Provider
        {
            Id = d["_id"].AsObjectId.ToString()
        };
    }
}
