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
        IsClient = d.GetValue("IsClient", false).AsBoolean,
        IsProvider = d.GetValue("IsProvider", false).AsBoolean,
        IsAdmin = d.GetValue("IsAdmin", false).AsBoolean,
        IsActive = d.GetValue("IsActive", true).AsBoolean,
        IsDeleted = d.GetValue("IsDeleted", false).AsBoolean,
        DeletedAt = ToDto(d.GetValue("EndTime", BsonNull.Value))
    };
    
    private static DateTimeOffset ToDto(BsonValue v) => v switch
    {
        BsonDateTime dt => new DateTimeOffset(dt.ToUniversalTime(), TimeSpan.Zero),
        BsonString s when DateTimeOffset.TryParse(s.Value, out var p) => p.ToUniversalTime(),
        _ => DateTimeOffset.UtcNow,
    };
}


