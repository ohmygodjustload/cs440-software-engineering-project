using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using static AppointmentScheduler.Api.Stores.BsonHelpers;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Reads the team BAAAM.Location collection. READ-ONLY.</summary>
public sealed class MongoLocationStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    : ILocationStore {
    private readonly IMongoCollection<BsonDocument> _raw =
        context.Database.GetCollection<BsonDocument>(options.Value.LocationsCollection);

    public Location? GetById(string id) {
        var doc = FindById(_raw, id);
        return doc is null || IsDeleted(doc)
            ? null
            : new Location {
                Id = ReadId(doc, "_id") ?? string.Empty,
                Street = ReadString(doc, "Street") ?? string.Empty,
                City = ReadString(doc, "City") ?? string.Empty,
                State = ReadString(doc, "State") ?? string.Empty,
                Zip = ReadInt(doc, "ZIP"),
            };
    }
}
