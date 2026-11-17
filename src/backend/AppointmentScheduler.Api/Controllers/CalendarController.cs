using AppointmentScheduler.Api.Auth;
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
    private readonly ICurrentUser? _currentUser;
    private readonly IUserStore? _userStore;
    private readonly IAppointmentTypeStore? _appointmentTypeStore;

    public CalendarController(IAppointmentStore store, ICurrentUser? currentUser = null, IUserStore? userStore = null, IAppointmentTypeStore? appointmentTypeStore = null)
    {
        _store = store;
        _currentUser = currentUser;
        _userStore = userStore;
        _appointmentTypeStore = appointmentTypeStore;
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

        var userId = _currentUser?.UserId;
        var query = _store.GetAll()
            .Where(a => a.EndDateTime > startDateTime && a.StartDateTime < endDateTime);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            // Check if the user is a provider
            var user = _userStore?.GetById(userId);

            if (user is not null && user.IsServiceProvider)
            {
                // --- PROVIDER CALENDAR ---
                // Providers see:
                // 1. Appointments linked via their AppointmentType (includes Available slots and Booked appointments)
                // 2. Their own booked appointments where UserId matches the provider's UserId
                // They exclude only cancelled appointments; Available and Booked are both shown.

                // Get appointment types for this provider
                var providerTypes = _appointmentTypeStore?.GetByProviderId(userId) ?? new List<AppointmentType>();
                var providerTypeIds = providerTypes.Select(t => t.Id).ToList();

                // Get appointments linked to this provider's types OR where UserId is this provider
                // - providerTypeIds.Contains(...) covers Available slots and Booked appointments linked to the type
                // - a.UserId == userId covers appointments directly owned/assigned to this provider
                query = query.Where(a =>
                    // Appointments linked via AppointmentType.ProviderId (covers Available slots + Booked)
                    (providerTypeIds.Count > 0 && providerTypeIds.Contains(a.AppointmentTypeId ?? "")) ||
                    // Or appointments directly owned by this provider (UserId matches provider's UserId)
                    a.UserId == userId
                )
                .Where(a => a.Status != AppointmentStatus.Canceled);
            }
            else
            {
                // --- CLIENT CALENDAR ---
                // Clients see only their booked appointments (UserId matches client's UserId),
                // excluding Available slots and cancelled appointments.
                query = query.Where(a => a.UserId == userId)
                    .Where(a => a.Status != AppointmentStatus.Canceled
                            && a.Status != AppointmentStatus.Available);
            }
        }
        else
        {
            // No user authenticated - show only booked appointments (original behavior)
            query = query.Where(a => a.Status != AppointmentStatus.Canceled
                                && a.Status != AppointmentStatus.Available);
        }

        var items = query
            .Where(a => !category.HasValue || a.Category == category.Value)
            .OrderBy(a => a.StartDateTime)
            .Select(a => new CalendarItem(a.Id, a.Title, a.Category, a.StartDateTime, a.EndDateTime, a.Status))
            .ToList();

        return Ok(items);
    }
}
