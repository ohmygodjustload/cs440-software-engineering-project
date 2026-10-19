using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Per-user notification history and read-state management. No authentication is
/// enforced here - the user id is accepted as a path parameter and ownership is
/// guaranteed by the store layer (stores only return records keyed on that id).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationPreferencesStore _preferences;

    public NotificationsController(INotificationPreferencesStore preferences)
    {
        _preferences = preferences;
    }

    /// <summary>
    /// Returns the signed-in user's recent notification history, newest first.
    /// No BAAAM.User record is required for reads - notification history is
    /// independent of the account directory.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AppNotification>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<AppNotification>> List([FromQuery] string? mine = null)
    {
        if (string.IsNullOrEmpty(mine))
        {
            return BadRequest("The 'mine' query parameter is required (e.g. ?mine=true).");
        }

        return Ok(_preferences.GetHistoryForUser(mine).ToList());
    }

    /// <summary>
    /// Marks every unread notification for the signed-in user as read.
    /// </summary>
    [HttpPost("mark-all-read")]
    [ProducesResponseType<MarkAllReadResult>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<MarkAllReadResult> MarkAllRead([FromBody] MarkAllReadRequest request)
    {
        if (string.IsNullOrEmpty(request.UserId))
        {
            return BadRequest("The 'userId' field is required.");
        }

        var updated = _preferences.MarkAllRead(request.UserId);
        return Ok(new MarkAllReadResult { Updated = updated ? 1 : 0 });
    }
}

public sealed class MarkAllReadRequest
{
    public string? UserId { get; set; }
}

public sealed class MarkAllReadResult
{
    public int Updated { get; set; }
}
