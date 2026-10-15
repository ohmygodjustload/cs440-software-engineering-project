using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Route("api/slots")]
public sealed class SlotsController(
    IAppointmentStore appointments,
    IUserStore users,
    IAppointmentTypeStore types,
    ILocationStore locations,
    ICurrentUser currentUser) : ControllerBase {
    [HttpPost]
    public ActionResult<Appointment> Create([FromBody] CreateSlotDto dto) {
        var check = Validate(dto.AppointmentTypeId!, dto.StartTime!.Value, ignoreSlotId: null);
        if (check.Error is not null) return check.Error;

        var slot = Build(check, id: null);
        var created = appointments.AddSlot(slot);
        return CreatedAtAction(nameof(GetMine), new { }, created);
    }

    [HttpGet("mine")]
    public ActionResult<IReadOnlyList<Appointment>> GetMine() {
        var (provider, error) = GetApprovedProvider();
        if (error is not null) return error;
        return Ok(appointments.GetAll()
            .Where(a => a.ProviderId == provider!.Id && a.Status == AppointmentStatus.Available)
            .OrderBy(a => a.StartDateTime).ToList());
    }

    /// <summary>
    /// Open slots a client can book. No login required. Only future, unbooked slots whose provider is an
    /// approved provider (User.IsServiceProvider and User.IsActive), soonest first.
    /// <paramref name="from"/> is inclusive and <paramref name="to"/> exclusive, both on the UTC start time.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<IReadOnlyList<Appointment>> GetAvailable(
        AppointmentCategory? category = null,
        string? providerId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null) {
        if (from >= to) return BadRequest("'from' must be before 'to'.");

        var now = DateTimeOffset.UtcNow;
        var typeCache = new Dictionary<string, AppointmentType?>(StringComparer.OrdinalIgnoreCase);
        var providerCache = new Dictionary<string, User?>(StringComparer.OrdinalIgnoreCase);
        var open = new List<Appointment>();

        foreach (var a in appointments.GetAll()) {
            if (a.IsDeleted || a.Status != AppointmentStatus.Available || a.UserId is not null) continue;
            if (a.StartDateTime <= now || a.StartDateTime < from || a.StartDateTime >= to) continue;

            var type = a.AppointmentTypeId is null ? null : Cached(typeCache, a.AppointmentTypeId, types.GetById);
            var ownerId = type?.ProviderId ?? a.ProviderId;
            if (!string.IsNullOrWhiteSpace(providerId)
                && !string.Equals(ownerId, providerId.Trim(), StringComparison.OrdinalIgnoreCase)) continue;

            var slotCategory = type is null ? a.Category : CategoryOf(type);
            if (category is not null && slotCategory != category) continue;

            if (Cached(providerCache, ownerId, users.GetById) is not
                { IsServiceProvider: true, IsActive: true } provider)
                continue;

            open.Add(new Appointment {
                Id = a.Id,
                Title = type is not null && !string.IsNullOrWhiteSpace(type.CustomServiceName)
                    ? type.CustomServiceName
                    : a.Title,
                Category = slotCategory,
                StartDateTime = a.StartDateTime,
                EndDateTime = a.EndDateTime,
                ProviderId = ownerId,
                ProviderName = $"{provider.FirstName} {provider.LastName}".Trim(),
                Location = a.Location ?? (type is null ? null : locations.GetById(type.LocationId)?.ToString()),
                AppointmentTypeId = a.AppointmentTypeId,
                UserId = null,
                Status = AppointmentStatus.Available,
                Notes = a.Notes,
            });
        }

        return Ok(open.OrderBy(s => s.StartDateTime).ThenBy(s => s.Id, StringComparer.Ordinal).ToList());
    }

    /// <summary>
    /// Books an open slot for the signed-in client. The client always comes from <see cref="ICurrentUser"/>,
    /// never the body. Returns what the confirmation screen needs: provider, service, location, and time.
    /// </summary>
    [HttpPost("{id}/book")]
    public ActionResult<Appointment> Book(string id, [FromBody] BookSlotDto? dto = null) {
        if (currentUser.UserId is null) return Unauthorized();
        if (users.GetById(currentUser.UserId) is not { IsClient: true, IsActive: true } client) return Forbid();

        var slot = appointments.GetById(id);
        if (slot is null) return NotFound();

        var type = slot.AppointmentTypeId is null ? null : types.GetById(slot.AppointmentTypeId);
        var ownerId = type?.ProviderId ?? slot.ProviderId;
        if (string.Equals(ownerId, client.Id, StringComparison.OrdinalIgnoreCase)) return Forbid();
        if (users.GetById(ownerId) is not { IsServiceProvider: true, IsActive: true } provider) return NotFound();

        if (slot.StartDateTime <= DateTimeOffset.UtcNow) return BadRequest("This slot has already started.");
        if (slot.Status != AppointmentStatus.Available || slot.UserId is not null)
            return Conflict("Slot is no longer available.");

        var overlaps = appointments.GetAll().Any(a =>
            a.UserId == client.Id
            && a.Id != slot.Id
            && a.Status != AppointmentStatus.Canceled
            && a.StartDateTime < slot.EndDateTime && slot.StartDateTime < a.EndDateTime); // half-open intervals
        if (overlaps) return Conflict("You already have an appointment at this time.");

        var notes = dto?.Notes?.Trim() ?? "";
        if (!appointments.BookSlot(slot.Id, client.Id, notes)) return Conflict("Slot is no longer available.");

        var booked = appointments.GetById(slot.Id);
        return booked is null ? Conflict("Slot is no longer available.") : Ok(Describe(booked, type, provider));
    }

    [HttpPut("{id}")]
    public ActionResult<Appointment> Update(string id, [FromBody] UpdateSlotDto dto) {
        var (provider, error) = GetApprovedProvider();
        if (error is not null) return error;

        var existing = appointments.GetById(id);
        if (existing is null || existing.ProviderId != provider!.Id) return NotFound();
        if (existing.Status != AppointmentStatus.Available) return Conflict("Slot is no longer available.");

        var check = Validate(dto.AppointmentTypeId ?? existing.AppointmentTypeId!,
            dto.StartTime ?? existing.StartDateTime, ignoreSlotId: id);
        if (check.Error is not null) return check.Error;

        var updated = Build(check, id);
        return appointments.UpdateSlot(updated) ? Ok(updated) : Conflict("Slot is no longer available.");
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id) {
        var (provider, error) = GetApprovedProvider();
        if (error is not null) return error;

        var existing = appointments.GetById(id);
        if (existing is null || existing.ProviderId != provider!.Id) return NotFound();
        if (existing.Status != AppointmentStatus.Available) return Conflict("Only Available slots can be deleted.");

        return appointments.SoftDeleteSlot(id) ? NoContent() : Conflict("Slot is no longer available.");
    }

    // ---------- helpers ----------

    private static T? Cached<T>(Dictionary<string, T?> cache, string key, Func<string, T?> load) where T : class {
        if (!cache.TryGetValue(key, out var value)) cache[key] = value = load(key);
        return value;
    }

    private Appointment Describe(Appointment a, AppointmentType? type, User provider) => new() {
        Id = a.Id,
        Title = type is not null && !string.IsNullOrWhiteSpace(type.CustomServiceName)
            ? type.CustomServiceName
            : a.Title,
        Category = type is null ? a.Category : CategoryOf(type),
        StartDateTime = a.StartDateTime,
        EndDateTime = a.EndDateTime,
        ProviderId = provider.Id,
        ProviderName = $"{provider.FirstName} {provider.LastName}".Trim(),
        Location = a.Location ?? (type is null ? null : locations.GetById(type.LocationId)?.ToString()),
        AppointmentTypeId = a.AppointmentTypeId,
        UserId = a.UserId,
        Status = a.Status,
        Notes = a.Notes,
    };

    private static AppointmentCategory CategoryOf(AppointmentType t) =>
        t.IsBeauty ? AppointmentCategory.Beauty
        : t.IsFitness ? AppointmentCategory.Fitness : AppointmentCategory.Medical;

    private (User? User, ActionResult? Error) GetApprovedProvider() {
        if (currentUser.UserId is null) return (null, Unauthorized());
        var user = users.GetById(currentUser.UserId);
        return user is null || !user.IsServiceProvider || !user.IsActive ? (null, Forbid()) : (user, null);
    }

    private sealed record Checked(
        ActionResult? Error,
        User? Provider,
        AppointmentType? Type,
        DateTimeOffset Start,
        DateTimeOffset End);

    private Checked Validate(string typeId, DateTimeOffset start, string? ignoreSlotId) {
        var (provider, error) = GetApprovedProvider();
        if (error is not null) return new Checked(error, null, null, default, default);

        var type = types.GetById(typeId);
        if (type is null) return Fail(BadRequest("Unknown appointment type."));
        if (type.ProviderId != provider!.Id) return Fail(Forbid());
        if (type.DurationInMinutes <= 0) return Fail(BadRequest("Appointment type has no duration."));

        start = start.ToUniversalTime();
        if (start <= DateTimeOffset.UtcNow) return Fail(BadRequest("Start time must be in the future."));

        var end = start.AddMinutes(type.DurationInMinutes);
        var overlaps = appointments.GetAll().Any(a =>
            a.ProviderId == provider.Id
            && a.Id != ignoreSlotId
            && a.Status != AppointmentStatus.Canceled
            && a.StartDateTime < end && start < a.EndDateTime); // half-open intervals
        return overlaps
            ? Fail(Conflict("Overlaps an existing appointment."))
            : new Checked(null, provider, type, start, end);

        static Checked Fail(ActionResult e) => new(e, null, null, default, default);
    }

    private Appointment Build(Checked c, string? id) => new() {
        Id = id ?? Guid.NewGuid().ToString("N"),
        Title = c.Type!.CustomServiceName,
        Category = CategoryOf(c.Type),
        StartDateTime = c.Start,
        EndDateTime = c.End,
        ProviderId = c.Provider!.Id,
        ProviderName = $"{c.Provider.FirstName} {c.Provider.LastName}".Trim(),
        Location = locations.GetById(c.Type.LocationId)?.ToString(),
        AppointmentTypeId = c.Type.Id,
        UserId = null,
        Status = AppointmentStatus.Available,
        Notes = "",
    };
}
