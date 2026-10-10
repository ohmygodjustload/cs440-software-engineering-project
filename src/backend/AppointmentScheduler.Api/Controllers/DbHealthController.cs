using AppointmentScheduler.Api.Data;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Database health + connectivity probe.
/// /api/health stays dependency-free; this one verifies MongoDB is reachable
/// and that the configured collections are accessible.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class DbHealthController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IServiceProvider _services;
    private readonly ILogger<DbHealthController> _logger;

    public DbHealthController(IConfiguration config, IServiceProvider services, ILogger<DbHealthController> logger)
    {
        _config = config;
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Reports MongoDB connectivity, latency, config source (without leaking the
    /// secret), collections, and live document counts — everything the /db admin
    /// page needs to render connection + entries in one call.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    /// <summary>
    /// Check MongoDB configuration and connectivity.
    /// When MongoDB is not configured the endpoint reports the in-memory fallback state.
    /// When configured, performs a lightweight round-trip to list collection names.
    /// </summary>
    /// <returns>
    /// 200 OK with store status and collections when healthy; 503 ServiceUnavailable when the database
    /// cannot be reached.
    /// </returns>
    public IActionResult Get()
    {
        var (configured, configSource, serverHint) = DescribeConfiguration();

        if (!configured)
        {
            return Ok(new
            {
                status = "not-configured",
                store = "in-memory",
                configSource,
                server = (string?)null,
                database = (string?)null,
                hint = "Set MongoDb:ConnectionString (User Secrets / appsettings.Development.json / MongoDb__ConnectionString) to use Atlas."
            });
        }

        try
        {
            var context = _services.GetRequiredService<MongoDbContext>();
            var settings = _config.GetSection(MongoDbSettings.SectionName).Get<MongoDbSettings>() ?? new MongoDbSettings();

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var collections = context.Database.ListCollectionNames().ToList();
            stopwatch.Stop();

            long Count(string name)
            {
                try { return (long)context.Database.GetCollection<BsonDocument>(name).EstimatedDocumentCount(); }
                catch { return -1; }
            }

            var counts = new Dictionary<string, long>
            {
                [settings.AppointmentsCollection] = Count(settings.AppointmentsCollection),
                [settings.ProvidersCollection] = Count(settings.ProvidersCollection),
                [settings.UsersCollection] = Count(settings.UsersCollection),
            };

            foreach (var extra in new[]
            {
                "Status", "ServiceType", "Location", "AppointmentType", "ProviderServiceConfig",
                "ProviderRequest", "AppointmentAuditLog",
            })
            {
                if (collections.Contains(extra) && !counts.ContainsKey(extra))
                {
                    counts[extra] = Count(extra);
                }
            }

            return Ok(new
            {
                status = "ok",
                store = "mongodb",
                configSource,
                server = serverHint,
                database = context.Database.DatabaseNamespace.DatabaseName,
                latencyMs = stopwatch.ElapsedMilliseconds,
                collections,
                counts
            });
        }
        catch (Exception ex)
        {
            // Full detail stays in the server log; callers get a sanitized 503.
            _logger.LogWarning(ex, "MongoDB health probe failed");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "unhealthy",
                store = "mongodb",
                configSource,
                server = serverHint,
                error = "Database unavailable. Check the connection string, IP access list, and network, then retry."
            });
        }
    }

    /// <summary>
    /// Figures out where the connection string came from and derives a safe
    /// server hint (host only — never the password) for display.
    /// </summary>
    private (bool configured, string source, string? serverHint) DescribeConfiguration()
    {
        var fromConfig = _config.GetValue<string>($"{MongoDbSettings.SectionName}:ConnectionString");
        string? raw = null;
        var source = "none";

        if (!string.IsNullOrWhiteSpace(fromConfig))
        {
            raw = fromConfig;
            source = "appsettings / user-secrets";
        }
        else if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MongoDb__ConnectionString")))
        {
            raw = Environment.GetEnvironmentVariable("MongoDb__ConnectionString");
            source = "env:MongoDb__ConnectionString";
        }
        else if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING")))
        {
            raw = Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING");
            source = "env:MONGODB__CONNECTIONSTRING";
        }

        if (string.IsNullOrWhiteSpace(raw))
        {
            return (false, source, null);
        }

        return (true, source, SafeServerHint(raw));
    }

    /// <summary>Extracts host from a MongoDB string without leaking credentials.</summary>
    private static string? SafeServerHint(string connectionString)
    {
        try
        {
            var at = connectionString.IndexOf('@');
            var rest = at >= 0 ? connectionString[(at + 1)..] : connectionString;
            var scheme = rest.IndexOf("://", StringComparison.Ordinal);
            if (scheme >= 0)
            {
                rest = rest[(scheme + 3)..];
            }

            var end = rest.IndexOfAny(['/', '?']);
            var host = (end >= 0 ? rest[..end] : rest).Trim();
            return string.IsNullOrWhiteSpace(host) ? null : host;
        }
        catch
        {
            return null;
        }
    }
}
