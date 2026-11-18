using System.Security.Claims;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Security;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/account/modes")]
public sealed class AccountModesController(AccountModeWorkflow workflow, JwtTokenService tokens) : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Run(id => Ok(workflow.Status(id)));

    [HttpPost("enable-client")]
    public IActionResult EnableClient() => Run(id => Ok(tokens.CreateToken(workflow.EnableClient(id))));

    [HttpPost("provider-application")]
    public IActionResult Apply([FromBody] AddProviderRoleRequest dto) => Run(id =>
        StatusCode(201, workflow.Apply(id, dto)));

    // Reissue from the authoritative account after an admin approved the application. No role flags come from the browser.
    [HttpPost("refresh-session")]
    public IActionResult RefreshSession() => Run(id => Ok(tokens.CreateToken(workflow.Status(id).User)));

    private IActionResult Run(Func<string, IActionResult> action)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(id)) return Unauthorized();
        try { return action(id); }
        catch (AccountModeException error) { return StatusCode(error.Status, error.Message); }
    }
}
