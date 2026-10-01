using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Stores;

/// <summary>
/// Reads the existing team BAAAM.User collection. READ-ONLY and NEVER returns
/// Password. New documents are never created here.
/// </summary>
public sealed class MongoUserStore : IUserStore
{
    private readonly IMongoCollection<BsonDocument> _raw;

    public MongoUserStore(MongoDbContext context, IOptions<MongoDbSettings> options)
    {
        _raw = context.Database.GetCollection<BsonDocument>(options.Value.UsersCollection);
    }

    public IReadOnlyList<User> GetAll() =>
        _raw.Find(FilterDefinition<BsonDocument>.Empty)
            .ToList()
            .Select(Map)
            .OrderBy(u => u.Username)
            .ToList();

    public User? GetById(string id)
    {
        if (!ObjectId.TryParse(id, out var oid))
        {
            return null;
        }

        var doc = _raw.Find(Builders<BsonDocument>.Filter.Eq("_id", oid)).FirstOrDefault();
        return doc is null ? null : Map(doc);
    }

    private static User Map(BsonDocument d) => new()
    {
        Id = d["_id"].AsObjectId.ToString(),
        FirstName = d.GetValue("FirstName", "").AsString,
        LastName = d.GetValue("LastName", "").AsString,
        Username = d.GetValue("Username", "").AsString,
        Email = d.GetValue("email", BsonNull.Value) is BsonString e ? e.Value : null,
        Phone = d.GetValue("phone", BsonNull.Value) is BsonString p ? p.Value : null,
        IsClient = d.GetValue("IsClient", false).AsBoolean,
        IsServiceProvider = d.GetValue("IsServiceProvider", false).AsBoolean,
        IsAdmin = d.GetValue("IsAdmin", false).AsBoolean,
    };
}
