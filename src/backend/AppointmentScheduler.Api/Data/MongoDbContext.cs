using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Data;

/// <summary>
/// Creates and shares the single <see cref="IMongoDatabase"/> for the API.
/// Registered as a singleton in Program.cs when a connection string is present.
/// </summary>
public sealed class MongoDbContext
{
    public MongoDbContext(IOptions<MongoDbSettings> options)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ConnectionString))
        {
            throw new InvalidOperationException(
                "MongoDb:ConnectionString is not configured. See appsettings.Development.json.example.");
        }

        var clientSettings = MongoClientSettings.FromConnectionString(settings.ConnectionString);

        // Atlas requires TLS; the driver enables it automatically for +srv strings,
        // but be explicit so a non-SRV string can't silently downgrade.
        clientSettings.UseTls = true;

        // Fail fast at startup instead of hanging a request for 30s.
        clientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
        clientSettings.ConnectTimeout = TimeSpan.FromSeconds(5);

        Client = new MongoClient(clientSettings);
        Database = Client.GetDatabase(settings.DatabaseName);
    }

    public IMongoClient Client { get; }

    public IMongoDatabase Database { get; }
}
