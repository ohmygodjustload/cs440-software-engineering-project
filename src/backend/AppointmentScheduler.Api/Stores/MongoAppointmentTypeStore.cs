using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using static AppointmentScheduler.Api.Stores.BsonHelpers;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Reads the team BAAAM.AppointmentType collection. READ-ONLY.</summary>
public sealed class MongoAppointmentTypeStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    : IAppointmentTypeStore {
    private readonly IMongoCollection<BsonDocument> _raw =
        context.Database.GetCollection<BsonDocument>(options.Value.AppointmentTypesCollection);

    public AppointmentType? GetById(string id) {
        var doc = FindById(_raw, id);
        return doc is null || IsDeleted(doc) ? null : Map(doc);
    }

    public IReadOnlyList<AppointmentType> GetByProviderId(string providerId) =>
        [.. _raw.Find(IdEquals("ProviderId", providerId)).ToList().Where(d => !IsDeleted(d)).Select(Map)];

    private static AppointmentType Map(BsonDocument d) => new() {
        Id = ReadId(d, "_id") ?? string.Empty,
        ProviderId = ReadId(d, "ProviderId") ?? string.Empty,
        CustomServiceName = ReadString(d, "CustomServiceName") ?? string.Empty,
        DurationInMinutes = ReadInt(d, "DurationInMinutes"),
        Price = ReadDecimal(d, "Price"),
        LocationId = ReadId(d, "LocationId") ?? string.Empty,
        Contact = ReadString(d, "Contact"),
        IsMedical = ReadBool(d, "IsMedical"),
        IsBeauty = ReadBool(d, "IsBeauty"),
        IsFitness = ReadBool(d, "IsFitness"),
    };
}
