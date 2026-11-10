using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Services;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Account notifications for signed-in accounts. Admins can also review the complete
/// notification stream received by every account.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class NotificationsController(
    ICurrentUser currentUser,
    IUserStore users,
    INotificationStore notifications) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<Notification>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<IReadOnlyList<Notification>> List([FromQuery] bool mine = false)
    {
        if (!mine) return BadRequest("Query parameter 'mine=true' is required.");
        if (currentUser.UserId is null) return Unauthorized();

        var user = users.GetById(currentUser.UserId);
        if (user is null) return Forbid();

        return Ok(user.IsAdmin ? notifications.GetAll() : notifications.GetAll(currentUser.UserId));
    }

    [HttpPost("mark-all-read")]
    [ProducesResponseType<MarkAllReadResult>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<MarkAllReadResult> MarkAllRead()
    {
        if (currentUser.UserId is null) return Unauthorized();

        var user = users.GetById(currentUser.UserId);
        if (user is null) return Forbid();

        var updated = notifications.MarkAllRead(currentUser.UserId);
        return Ok(new MarkAllReadResult { Updated = updated });
    }
}

public sealed class MarkAllReadResult
{
    public bool Updated { get; set; }
}
