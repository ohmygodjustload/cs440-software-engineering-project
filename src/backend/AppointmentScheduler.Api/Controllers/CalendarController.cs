using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Lightweight calendar feed: same data as appointments but trimmed down
/// so the calendar view stays fast.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class CalendarController : ControllerBase
{
    private readonly IAppointmentStore _store;

    public CalendarController(IAppointmentStore store)
    {
        _store = store;
    }

    /// <summary>Get calendar items in a date range. Defaults to the current month.</summary>
    /// <remarks>
    /// The range is half-open <c>[from, to)</c>: an appointment starting exactly at
    /// <c>to</c> belongs to the next range, and one ending exactly at <c>from</c>
    /// belongs to the previous range. Overlap is therefore
    /// <c>EndDateTime &gt; from &amp;&amp; StartDateTime &lt; to</c>.
    /// Cancelled appointments are excluded so they do not block the calendar view;
    /// query <c>GET /api/appointments?status=Cancelled</c> to keep cancelled history.
    /// </remarks>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CalendarItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<IReadOnlyList<CalendarItem>> Get(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] AppointmentCategory? category)
    {
        var now = DateTimeOffset.UtcNow;
        var startDateTime = from ?? new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var endDateTime = to ?? startDateTime.AddMonths(1);

        if (endDateTime < startDateTime)
        {
            return BadRequest("to must not be before from.");
        }

        var items = _store.GetAll()
            .Where(a => a.EndDateTime > startDateTime && a.StartDateTime < endDateTime)
            .Where(a => !category.HasValue || a.Category == category.Value)
            .Where(a => a.Status != AppointmentStatus.Cancelled)
            .OrderBy(a => a.StartDateTime)
            .Select(a => new CalendarItem(a.Id, a.Title, a.Category, a.StartDateTime, a.EndDateTime, a.Status))
            .ToList();

        return Ok(items);
    }
}
