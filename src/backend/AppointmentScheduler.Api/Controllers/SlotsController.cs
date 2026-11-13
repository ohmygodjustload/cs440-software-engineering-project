using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Services;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Route("api/slots")]
public sealed class SlotsController(
    IAppointmentStore appointments,
    IUserStore users,
    IAppointmentTypeStore types,
    ILocationStore locations,
    ICurrentUser currentUser,
    INotificationService? notificationService = null,
    IAppointmentAuditStore? audit = null) : ControllerBase {
    [HttpPost]
    public ActionResult<Appointment> Create([FromBody] CreateSlotDto dto) {
        var check = Validate(dto.AppointmentTypeId!, dto.StartTime!.Value, ignoreSlotId: null);
        if (check.Error is not null) return check.Error;

        var slot = Build(check, id: null);
        var created = appointments.AddSlot(slot);
        notificationService?.OnSlotCreated(currentUser.UserId!, created.Id, created.Category, created.Title);
        audit?.Add(new AppointmentAuditEntry
        {
            AppointmentId = created.Id,
            ChangedByUserId = currentUser.UserId!,
            Action = AppointmentAuditEntry.Created,
            NewStatus = AppointmentStatus.Available
        });
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
        if (booked is not null)
        {
            audit?.Add(new AppointmentAuditEntry
            {
                AppointmentId = booked.Id,
                ChangedByUserId = client.Id,
                Action = AppointmentAuditEntry.StatusChange,
                OldStatus = AppointmentStatus.Available,
                NewStatus = AppointmentStatus.Booked
            });
            var clientUser = users.GetById(client.Id);
            notificationService?.OnAppointmentBooked(
                client.Id, ownerId, booked.Id, booked.Category, booked.Title,
                clientUser is null ? null : $"{clientUser.FirstName} {clientUser.LastName}");
        }

        return booked is null ? Conflict("Slot is no longer available.") : Ok(Describe(booked, type, provider));
    }

    [HttpPut("{id}")]
    public ActionResult<Appointment> Update(string id, [FromBody] UpdateSlotDto dto) {
        var (provider, error) = GetApprovedProvider();
        if (error is not null) return error;

        var existing = appointments.GetById(id);
        if (existing is null) return NotFound();
        if (existing.ProviderId != provider!.Id) return Forbid();

        if (existing.Status == AppointmentStatus.Booked)
            return UpdateBooked(existing, provider, dto);
        if (existing.Status != AppointmentStatus.Available)
            return Conflict("Slot is no longer available.");

        return UpdateAvailable(existing, provider, dto);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(
        string id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ConfirmDto? dto = null) {
        var (provider, error) = GetApprovedProvider();
        if (error is not null) return error;

        var existing = appointments.GetById(id);
        if (existing is null) return NotFound();
        if (existing.ProviderId != provider!.Id) return Forbid();

        if (existing.Status == AppointmentStatus.Booked) {
            if (dto?.Confirm != true)
                return Conflict(BookedConflict(existing));

            var clientId = existing.UserId;
            if (!appointments.CancelBooked(id))
                return Conflict("The appointment was modified by another process. Please retry.");

            audit?.Add(new AppointmentAuditEntry
            {
                AppointmentId = existing.Id,
                ChangedByUserId = provider.Id,
                Action = AppointmentAuditEntry.Cancelled,
                OldStatus = AppointmentStatus.Booked,
                NewStatus = AppointmentStatus.Canceled
            });
            if (!string.IsNullOrWhiteSpace(clientId))
                notificationService?.OnBookingCancelled(
                    clientId, provider.Id, existing.Id, existing.Category, existing.Title, "");
            return NoContent();
        }

        if (existing.Status != AppointmentStatus.Available)
            return Conflict("Only Available slots can be deleted.");

        if (!appointments.SoftDeleteSlot(id)) return Conflict("Slot is no longer available.");
        audit?.Add(new AppointmentAuditEntry
        {
            AppointmentId = existing.Id,
            ChangedByUserId = provider.Id,
            Action = AppointmentAuditEntry.Cancelled,
            OldStatus = AppointmentStatus.Available,
            NewStatus = AppointmentStatus.Available
        });
        notificationService?.OnAppointmentCancelled(string.Empty, provider.Id, existing.Id, existing.Category, existing.Title, string.Empty);
        return NoContent();
    }

    // ---------- helpers ----------

    private ActionResult<Appointment> UpdateBooked(Appointment existing, User provider, UpdateSlotDto dto) {
        if (!dto.Confirm)
            return Conflict(BookedConflict(existing));
        if (dto.AppointmentTypeId is not null)
            return BadRequest("Cannot change the appointment type of a booked slot.");
        if (dto.StartTime is null)
            return BadRequest("StartTime is required when rescheduling a booked slot.");
        if (string.IsNullOrWhiteSpace(existing.UserId))
            return Conflict("Booked slot has no client.");

        var start = dto.StartTime.Value.ToUniversalTime();
        if (start <= DateTimeOffset.UtcNow) return BadRequest("Start time must be in the future.");
        var duration = existing.EndDateTime - existing.StartDateTime;
        var end = start + duration;

        if (ProviderOverlaps(provider.Id, start, end, existing.Id))
            return Conflict("Overlaps an existing appointment.");
        if (ClientOverlaps(existing.UserId, start, end, existing.Id))
            return Conflict("The client already has an appointment at this time.");

        if (!appointments.RescheduleBooked(existing.Id, existing.UserId, start, end))
            return Conflict("The appointment was modified by another process. Please retry.");

        var updated = appointments.GetById(existing.Id)!;
        audit?.Add(new AppointmentAuditEntry
        {
            AppointmentId = updated.Id,
            ChangedByUserId = provider.Id,
            Action = AppointmentAuditEntry.Rescheduled,
            OldStatus = AppointmentStatus.Booked,
            NewStatus = AppointmentStatus.Booked
        });
        notificationService?.OnBookingRescheduled(
            existing.UserId, provider.Id, updated.Id, updated.Category, updated.Title, updated.StartDateTime);
        return Ok(updated);
    }

    private ActionResult<Appointment> UpdateAvailable(Appointment existing, User provider, UpdateSlotDto dto) {
        // Time-only move: keep fields and duration, skip type lookup (publish-created slots
        // often have type ids that are not in the appointment-type store).
        if (dto.AppointmentTypeId is null && dto.StartTime is not null) {
            var start = dto.StartTime.Value.ToUniversalTime();
            if (start <= DateTimeOffset.UtcNow) return BadRequest("Start time must be in the future.");
            var duration = existing.EndDateTime - existing.StartDateTime;
            var end = start + duration;
            if (ProviderOverlaps(provider.Id, start, end, existing.Id))
                return Conflict("Overlaps an existing appointment.");

            var moved = Clone(existing);
            moved.StartDateTime = start;
            moved.EndDateTime = end;
            if (!appointments.UpdateSlot(moved)) return Conflict("Slot is no longer available.");
            audit?.Add(new AppointmentAuditEntry
            {
                AppointmentId = moved.Id,
                ChangedByUserId = provider.Id,
                Action = AppointmentAuditEntry.Rescheduled,
                OldStatus = AppointmentStatus.Available,
                NewStatus = AppointmentStatus.Available
            });
            var changes = ActivityChangeFormatter.Describe(
                ("Start", existing.StartDateTime, moved.StartDateTime),
                ("End", existing.EndDateTime, moved.EndDateTime));
            notificationService?.OnAppointmentUpdated(moved.Id, moved.Category, moved.Title, currentUser.UserId, changes);
            return Ok(moved);
        }

        var check = Validate(dto.AppointmentTypeId ?? existing.AppointmentTypeId!,
            dto.StartTime ?? existing.StartDateTime, ignoreSlotId: existing.Id);
        if (check.Error is not null) return check.Error;

        var updated = Build(check, existing.Id);
        if (!appointments.UpdateSlot(updated)) return Conflict("Slot is no longer available.");
        audit?.Add(new AppointmentAuditEntry
        {
            AppointmentId = updated.Id,
            ChangedByUserId = provider.Id,
            Action = AppointmentAuditEntry.Rescheduled,
            OldStatus = AppointmentStatus.Available,
            NewStatus = AppointmentStatus.Available
        });
        var typedChanges = ActivityChangeFormatter.Describe(
            ("Title", existing.Title, updated.Title),
            ("Category", existing.Category, updated.Category),
            ("Start", existing.StartDateTime, updated.StartDateTime),
            ("End", existing.EndDateTime, updated.EndDateTime),
            ("Location", existing.Location, updated.Location),
            ("Notes", existing.Notes, updated.Notes));
        notificationService?.OnAppointmentUpdated(updated.Id, updated.Category, updated.Title, currentUser.UserId, typedChanges);
        return Ok(updated);
    }

    private BookedSlotConflict BookedConflict(Appointment existing) {
        var client = string.IsNullOrWhiteSpace(existing.UserId) ? null : users.GetById(existing.UserId);
        var clientName = client is null
            ? existing.UserId
            : $"{client.FirstName} {client.LastName}".Trim();
        return new BookedSlotConflict
        {
            Message = "This slot is booked. Confirm to continue.",
            RequiresConfirm = true,
            ClientName = string.IsNullOrWhiteSpace(clientName) ? existing.UserId : clientName,
            StartDateTime = existing.StartDateTime
        };
    }

    private bool ProviderOverlaps(string providerId, DateTimeOffset start, DateTimeOffset end, string ignoreId) =>
        appointments.GetAll().Any(a =>
            a.ProviderId == providerId
            && a.Id != ignoreId
            && a.Status != AppointmentStatus.Canceled
            && a.StartDateTime < end && start < a.EndDateTime);

    private bool ClientOverlaps(string clientId, DateTimeOffset start, DateTimeOffset end, string ignoreId) =>
        appointments.GetAll().Any(a =>
            a.UserId == clientId
            && a.Id != ignoreId
            && a.Status != AppointmentStatus.Canceled
            && a.StartDateTime < end && start < a.EndDateTime);

    private static Appointment Clone(Appointment a) => new() {
        Id = a.Id,
        Title = a.Title,
        Category = a.Category,
        StartDateTime = a.StartDateTime,
        EndDateTime = a.EndDateTime,
        ProviderId = a.ProviderId,
        ProviderName = a.ProviderName,
        Location = a.Location,
        AppointmentTypeId = a.AppointmentTypeId,
        UserId = a.UserId,
        Status = a.Status,
        Notes = a.Notes,
        IsDeleted = a.IsDeleted,
        DeletedAt = a.DeletedAt,
    };

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
        var overlaps = ProviderOverlaps(provider.Id, start, end, ignoreSlotId ?? "");
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
