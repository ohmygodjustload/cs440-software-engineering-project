using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AppointmentsController : ControllerBase
{
    private readonly IAppointmentStore _store;
    private readonly IProviderStore? _providers;

    public AppointmentsController(IAppointmentStore store, IProviderStore? providerStore = null)
    {
        _store = store;
        _providers = providerStore;
    }

    [HttpGet]
    [ProducesResponseType<PagedResult<Appointment>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<PagedResult<Appointment>> List(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] AppointmentCategory? category,
        [FromQuery] AppointmentStatus? status,
        [FromQuery] string? providerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (from.HasValue && to.HasValue && to.Value < from.Value)
        {
            return BadRequest("to must not be before from.");
        }

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _store.GetAll().AsQueryable();

        if (from.HasValue)
        {
            // Half-open [from, to): an appointment ending exactly at `from`
            // belongs to the previous range.
            query = query.Where(a => a.EndDateTime > from.Value);
        }

        if (to.HasValue)
        {
            // Half-open [from, to): an appointment starting exactly at `to`
            // belongs to the next range.
            query = query.Where(a => a.StartDateTime < to.Value);
        }

        if (category.HasValue)
        {
            query = query.Where(a => a.Category == category.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(providerId))
        {
            query = query.Where(a => a.ProviderId == providerId);
        }

        var ordered = query.OrderBy(a => a.StartDateTime).ToList();
        var items = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new PagedResult<Appointment>(items, ordered.Count, page, pageSize));
    }

    [HttpGet("{id}")]
    [ProducesResponseType<Appointment>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Appointment> GetById(string id)
    {
        var item = _store.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<Appointment>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Appointment> Create([FromBody] CreateAppointmentDto dto)
    {
        if (!dto.StartDateTime.HasValue || !dto.EndDateTime.HasValue)
        {
            return BadRequest("StartDateTime and EndDateTime are required.");
        }

        if (dto.EndDateTime.Value <= dto.StartDateTime.Value)
        {
            return BadRequest("EndDateTime must be after StartDateTime.");
        }

        var appointment = new Appointment
        {
            Title = dto.Title.Trim(),
            Category = dto.Category!.Value,
            StartDateTime = dto.StartDateTime.Value,
            EndDateTime = dto.EndDateTime.Value,
            ProviderId = dto.ProviderId.Trim(),
            ProviderName = string.IsNullOrWhiteSpace(dto.ProviderName)
                ? ResolveProviderName(dto.ProviderId.Trim())
                : dto.ProviderName.Trim(),
            UserId = string.IsNullOrWhiteSpace(dto.UserId) ? "demo-user" : dto.UserId.Trim(),
            Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes,
            Status = AppointmentStatus.Scheduled
        };

        var created = _store.Add(appointment);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Update an appointment (edit / reschedule / cancel via status).</summary>
    [HttpPut("{id}")]
    [ProducesResponseType<Appointment>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Appointment> Update(string id, [FromBody] UpdateAppointmentDto dto)
    {
        var existing = _store.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        var startDateTime = dto.StartDateTime ?? existing.StartDateTime;
        var endDateTime = dto.EndDateTime ?? existing.EndDateTime;
        if (endDateTime <= startDateTime)
        {
            return BadRequest("EndDateTime must be after StartDateTime.");
        }

        if (dto.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest("Title cannot be empty.");
            }

            existing.Title = dto.Title.Trim();
        }

        if (dto.Category.HasValue)
        {
            existing.Category = dto.Category.Value;
        }

        existing.StartDateTime = startDateTime;
        existing.EndDateTime = endDateTime;

        if (dto.ProviderId is not null)
        {
            if (string.IsNullOrWhiteSpace(dto.ProviderId))
            {
                return BadRequest("ProviderId cannot be empty.");
            }

            var trimmedProviderId = dto.ProviderId.Trim();
            existing.ProviderId = trimmedProviderId;

            // Keep the denormalized ProviderName in sync when the provider changes,
            // unless the caller explicitly overrides it in the same request.
            if (dto.ProviderName is null)
            {
                existing.ProviderName = ResolveProviderName(trimmedProviderId);
            }
        }

        if (dto.ProviderName is not null)
        {
            existing.ProviderName = string.IsNullOrWhiteSpace(dto.ProviderName) ? null : dto.ProviderName.Trim();
        }

        if (dto.Location is not null)
        {
            existing.Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
        }

        if (dto.Notes is not null)
        {
            existing.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes;
        }

        if (dto.Status.HasValue)
        {
            existing.Status = dto.Status.Value;
        }

        _store.Update(existing);
        return Ok(existing);
    }

    /// <summary>
    /// Cancel an appointment (soft delete). The record is kept with
    /// <c>Status = Cancelled</c> so it stays visible as history via
    /// <c>GET /api/appointments/{id}</c> and <c>GET /api/appointments?status=Cancelled</c>;
    /// the calendar feed hides cancelled items so the slot frees up.
    /// Cancelling an already-cancelled appointment is a no-op returning 204.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete(string id)
    {
        var existing = _store.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (existing.Status != AppointmentStatus.Cancelled)
        {
            existing.Status = AppointmentStatus.Cancelled;
            _store.Update(existing);
        }

        return NoContent();
    }

    /// <summary>
    /// Look up the display name for a provider id. Returns null when no provider
    /// store is wired (tests) or the id is unknown, leaving ProviderName unset
    /// rather than failing the write.
    /// </summary>
    private string? ResolveProviderName(string providerId) =>
        _providers?.GetById(providerId)?.Name;
}
