using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
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
        return overlaps ? Fail(Conflict("Overlaps an existing appointment.")) : new Checked(null, provider, type, start, end);

        static Checked Fail(ActionResult e) => new(e, null, null, default, default);
    }

    private Appointment Build(Checked c, string? id) => new() {
        Id = id ?? Guid.NewGuid().ToString("N"),
        Title = c.Type!.CustomServiceName,
        Category = c.Type.IsBeauty ? AppointmentCategory.Beauty
            : c.Type.IsFitness ? AppointmentCategory.Fitness : AppointmentCategory.Medical,
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
