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
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CalendarItem>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<CalendarItem>> Get(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] AppointmentCategory? category)
    {
        var now = DateTimeOffset.UtcNow;
        var startDateTime = from ?? new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var endDateTime = to ?? startDateTime.AddMonths(1);

        var items = _store.GetAll()
            .Where(a => a.EndDateTime >= startDateTime && a.StartDateTime <= endDateTime)
            .Where(a => !category.HasValue || a.Category == category.Value)
            .Where(a => a.Status != AppointmentStatus.Cancelled)
            .OrderBy(a => a.StartDateTime)
            .Select(a => new CalendarItem(a.Id, a.Title, a.Category, a.StartDateTime, a.EndDateTime, a.Status))
            .ToList();

        return Ok(items);
    }
}
