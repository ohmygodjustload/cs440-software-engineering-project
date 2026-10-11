using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Security.Authentication;

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

        // Do NOT force UseTls here: the driver already enables TLS for +srv (Atlas)
        // strings and respects ?tls= options for plain mongodb:// strings.
        // Forcing it on unconditionally breaks non-TLS local connections and can
        // mask handshake misconfigurations.
        //
        // Atlas requires TLS 1.2+; some sandboxed/network clients negotiate 1.3
        // and never complete the handshake. Pinning to 1.2 makes the handshake
        // deterministic. Safe for plain mongodb:// hosts too.
        clientSettings.SslSettings = new SslSettings
        {
            EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
        };

        // Fail fast at startup instead of hanging a request for 30s.
        clientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
        clientSettings.ConnectTimeout = TimeSpan.FromSeconds(5);
        clientSettings.SocketTimeout = TimeSpan.FromSeconds(10);

        Client = new MongoClient(clientSettings);
        Database = Client.GetDatabase(settings.DatabaseName);
    }

    public IMongoClient Client { get; }

    public IMongoDatabase Database { get; }
}
