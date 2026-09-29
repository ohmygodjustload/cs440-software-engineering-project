using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>MongoDB-backed appointment store. Same interface the controllers already use.</summary>
public sealed class MongoAppointmentStore : IAppointmentStore
{
    private readonly IMongoCollection<Appointment> _collection;

    public MongoAppointmentStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _collection = context.Database.GetCollection<Appointment>(options.Value.AppointmentsCollection);
    }

    public IReadOnlyList<Appointment> GetAll() =>
        _collection.Find(FilterDefinition<Appointment>.Empty).SortBy(a => a.Start).ToList();

    public Appointment? GetById(string id) =>
        _collection.Find(a => a.Id == id).FirstOrDefault();

    public Appointment Add(Appointment appointment)
    {
        if (string.IsNullOrWhiteSpace(appointment.Id))
        {
            appointment.Id = Guid.NewGuid().ToString("N");
        }

        _collection.InsertOne(appointment);
        return appointment;
    }

    public bool Update(Appointment appointment)
    {
        var result = _collection.ReplaceOne(a => a.Id == appointment.Id, appointment);
        return result.MatchedCount > 0;
    }

    public bool Remove(string id)
    {
        var result = _collection.DeleteOne(a => a.Id == id);
        return result.DeletedCount > 0;
    }
}
