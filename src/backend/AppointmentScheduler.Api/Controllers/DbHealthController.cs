using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;
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
        var section = _config.GetSection(MongoDbSettings.SectionName);
        var configured = !string.IsNullOrWhiteSpace(section.GetValue<string>("ConnectionString"))
            || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MongoDb__ConnectionString"))
            || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING"));

        if (!configured)
        {
            return Ok(new
            {
                status = "not-configured",
                store = "in-memory",
                hint = "Set MongoDb:ConnectionString (User Secrets / appsettings.Development.json / MongoDb__ConnectionString) to use Atlas."
            });
        }

        try
        {
            var context = _services.GetRequiredService<MongoDbContext>();
            // Lightweight round-trip: list collection names in the configured database.
            var collections = context.Database.ListCollectionNames().ToList();
            return Ok(new
            {
                status = "ok",
                store = "mongodb",
                database = context.Database.DatabaseNamespace.DatabaseName,
                collections
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
                error = "Database unavailable. Check the connection string, IP access list, and network, then retry."
            });
        }
    }
}
