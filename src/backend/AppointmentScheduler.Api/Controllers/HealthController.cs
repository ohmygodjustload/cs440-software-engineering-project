using AppointmentScheduler.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Liveness endpoint used by the frontend and by deployment health checks to confirm that the
/// API is running. It deliberately has no dependencies so that it keeps answering even when a
/// downstream dependency (for example MongoDB) is unavailable.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    private const string ServiceName = "AppointmentScheduler.Api";

    /// <summary>Reports that the API is up.</summary>
    /// <returns>A <see cref="HealthResponse"/> describing the running service.</returns>
    [HttpGet]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> Get()
    {
        return Ok(new HealthResponse("ok", ServiceName, DateTimeOffset.UtcNow));
    }
}
