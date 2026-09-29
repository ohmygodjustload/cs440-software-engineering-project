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

    public DbHealthController(IConfiguration config, IServiceProvider services)
    {
        _config = config;
        _services = services;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        var section = _config.GetSection(MongoDbSettings.SectionName);
        var configured = !string.IsNullOrWhiteSpace(section.GetValue<string>("ConnectionString"))
            || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING"));

        if (!configured)
        {
            return Ok(new
            {
                status = "not-configured",
                store = "in-memory",
                hint = "Set MongoDb:ConnectionString (User Secrets / appsettings.Development.json / MONGODB__CONNECTIONSTRING) to use Atlas."
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
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "unhealthy",
                store = "mongodb",
                error = ex.Message
            });
        }
    }
}
