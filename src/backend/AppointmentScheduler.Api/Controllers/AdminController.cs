using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Services;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminController(
    IUserStore users,
    IAppointmentStore appointments,
    IActivityStore activity,
    ICurrentUser currentUser,
    INotificationService? notificationService = null,
    INotificationStore? notificationStore = null,
    IAppointmentAuditStore? audit = null) : ControllerBase
{
    [HttpGet("accounts")]
    public ActionResult<IReadOnlyList<User>> Accounts([FromQuery] string? search = null)
    {
        var normalized = search?.Trim();
        var result = users.GetAll()
            .Where(user => user.IsActive)
            .Where(user => string.IsNullOrWhiteSpace(normalized) ||
                $"{user.FirstName} {user.LastName} {user.Username} {user.Email} {user.Phone}"
                    .Contains(normalized, StringComparison.OrdinalIgnoreCase))
            .OrderBy(user => user.LastName)
            .ThenBy(user => user.FirstName)
            .ToList();
        return Ok(result);
    }

    [HttpPut("accounts/{id}")]
    public ActionResult<User> UpdateAccount(string id, [FromBody] UserUpdateRequest request)
    {
        var user = users.GetById(id);
        if (user is null || !user.IsActive) return NotFound();

        var changes = ActivityChangeFormatter.Describe(
            ("First name", user.FirstName, request.FirstName?.Trim() ?? user.FirstName),
            ("Last name", user.LastName, request.LastName?.Trim() ?? user.LastName),
            ("Email", user.Email, Normalize(request.Email) ?? user.Email),
            ("Phone", user.Phone, Normalize(request.Phone) ?? user.Phone));
        user.FirstName = request.FirstName?.Trim() ?? user.FirstName;
        user.LastName = request.LastName?.Trim() ?? user.LastName;
        user.Email = Normalize(request.Email) ?? user.Email;
        user.Phone = Normalize(request.Phone) ?? user.Phone;

        if (!users.Update(user)) return Conflict("The account was modified. Please retry.");
        notificationService?.OnAccountUpdated(user, currentUser.UserId, changes);
        activity.Add("ACCOUNT_UPDATED", ActivityMessage("Account updated", user.Username, changes), currentUser.UserId, user.Id);
        return Ok(user);
    }

    [HttpGet("appointments")]
    public ActionResult<IReadOnlyList<Appointment>> Appointments(
        [FromQuery] string? search = null,
        [FromQuery] DateTimeOffset? date = null)
    {
        var result = appointments.GetAll().AsEnumerable();
        if (date.HasValue)
        {
            var start = date.Value.Date;
            result = result.Where(item => item.StartDateTime < start.AddDays(1) && item.EndDateTime > start);
        }

        var normalized = search?.Trim();
        if (!string.IsNullOrWhiteSpace(normalized))
        {
            result = result.Where(item =>
                $"{item.Title} {item.Category} {item.Status} {item.ProviderName} {item.Location} {item.UserId}"
                    .Contains(normalized, StringComparison.OrdinalIgnoreCase));
        }

        return Ok(result.OrderBy(item => item.StartDateTime).ToList());
    }

    [HttpPut("appointments/{id}")]
    public ActionResult<Appointment> UpdateAppointment(
        string id,
        [FromBody] UpdateAppointmentDto request)
    {
        var appointment = appointments.GetById(id);
        if (appointment is null) return NotFound();

        var start = request.StartDateTime ?? appointment.StartDateTime;
        var end = request.EndDateTime ?? appointment.EndDateTime;

        if (end <= start)
            return BadRequest("EndDateTime must be after StartDateTime.");

        if (request.Title is not null &&
            string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest("Title cannot be empty.");
        }

        TimeZoneInfo displayTimeZone;

        if (string.IsNullOrWhiteSpace(request.TimeZoneId))
        {
            // Compatibility for older clients.
            // The formatter explicitly labels these values as UTC+00:00.
            displayTimeZone = TimeZoneInfo.Utc;
        }
        else
        {
            try
            {
                displayTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
                    request.TimeZoneId.Trim());
            }
            catch (TimeZoneNotFoundException)
            {
                return BadRequest(
                    "TimeZoneId is not supported by this server.");
            }
            catch (InvalidTimeZoneException)
            {
                return BadRequest(
                    "TimeZoneId is invalid on this server.");
            }
        }

        var title = request.Title?.Trim() ?? appointment.Title;
        var category = request.Category ?? appointment.Category;
        var providerId = request.ProviderId?.Trim() ?? appointment.ProviderId;
        var providerName =
            request.ProviderName?.Trim() ?? appointment.ProviderName;
        var location = request.Location?.Trim() ?? appointment.Location;
        var notes = request.Notes ?? appointment.Notes;
        var status = request.Status ?? appointment.Status;
        var originalStart = appointment.StartDateTime;
        var originalEnd = appointment.EndDateTime;
        var originalStatus = appointment.Status;

        // Compare the stored values against the effective new values.
        // Format both sides in the same explicitly selected time zone.
        var changes = ActivityChangeFormatter.DescribeInTimeZone(
            displayTimeZone,
            ("Title", appointment.Title, title),
            ("Category", appointment.Category, category),
            ("Start", appointment.StartDateTime, start),
            ("End", appointment.EndDateTime, end),
            ("Provider", appointment.ProviderId, providerId),
            ("Provider name", appointment.ProviderName, providerName),
            ("Location", appointment.Location, location),
            ("Notes", appointment.Notes, notes),
            ("Status", appointment.Status, status));

        appointment.Title = title;
        appointment.Category = category;
        appointment.StartDateTime = start.ToUniversalTime();
        appointment.EndDateTime = end.ToUniversalTime();
        appointment.ProviderId = providerId;
        appointment.ProviderName = providerName;
        appointment.Location = location;
        appointment.Notes = notes;
        appointment.Status = status;

        if (!appointments.Update(appointment))
            return Conflict("The appointment was modified. Please retry.");

        WriteAdminAudit(appointment, originalStart, originalEnd, originalStatus);

        notificationService?.OnAppointmentUpdated(
            appointment.Id,
            appointment.Category,
            appointment.Title,
            currentUser.UserId,
            changes);

        activity.Add(
            "APPOINTMENT_UPDATED",
            ActivityMessage("Appointment updated", appointment.Title, changes),
            currentUser.UserId,
            appointment.Id);

        return Ok(appointment);
    }

    [HttpGet("appointment-audit")]
    public ActionResult<IReadOnlyList<AppointmentAuditListItem>> AppointmentAudit(
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery] string? action = null)
    {
        if (from.HasValue && to.HasValue && to.Value < from.Value)
            return BadRequest("to must not be before from.");
        if (!string.IsNullOrWhiteSpace(action) &&
            !AppointmentAuditEntry.KnownActions.Contains(action.Trim()))
            return BadRequest("Unknown action. Use CREATED, RESCHEDULED, STATUS_CHANGE, or CANCELLED.");

        var entries = audit?.Query(from, to, action) ?? [];
        var items = entries.Select(entry =>
        {
            var appointment = appointments.GetById(entry.AppointmentId);
            var actor = users.GetById(entry.ChangedByUserId);
            var actorName = actor is null
                ? null
                : $"{actor.FirstName} {actor.LastName}".Trim();
            return new AppointmentAuditListItem
            {
                Id = entry.Id,
                AppointmentId = entry.AppointmentId,
                AppointmentTitle = appointment?.Title,
                ChangedByUserId = entry.ChangedByUserId,
                ChangedByName = string.IsNullOrWhiteSpace(actorName) ? actor?.Username : actorName,
                Timestamp = entry.Timestamp,
                Action = entry.Action,
                OldStatus = entry.OldStatus,
                NewStatus = entry.NewStatus
            };
        }).ToList();
        return Ok(items);
    }

    [HttpGet("activity")]
    public ActionResult<IReadOnlyList<ActivityEntry>> Activity([FromQuery] int limit = 200)
    {
        var storedNotifications = currentUser.UserId is null || notificationStore is null
            ? []
            : notificationStore.GetAll(currentUser.UserId)
                .Select(ToActivityEntry)
                .ToList();

        return Ok(storedNotifications.Count > 0
            ? storedNotifications.Take(Math.Clamp(limit, 1, 500)).ToList()
            : activity.GetAll(limit));
    }

    [HttpDelete("activity")]
    public IActionResult ClearActivity()
    {
        activity.Clear();
        return NoContent();
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ActivityEntry ToActivityEntry(Notification notification) =>
        new()
        {
            Id = notification.Id,
            Timestamp = notification.CreatedAt,
            Action = notification.Event.Replace('-', '_').ToUpperInvariant(),
            Message = $"{notification.EventLabel}: {notification.Message}",
            IsRead = notification.IsRead,
            EntityId = notification.AppointmentId
        };

    private static string ActivityMessage(string action, string subject, string changes) =>
        $"{action}: {subject}; {ActivityChangeFormatter.Summary(changes)}";

    private void WriteAdminAudit(
        Appointment appointment,
        DateTimeOffset originalStart,
        DateTimeOffset originalEnd,
        AppointmentStatus originalStatus)
    {
        if (audit is null || currentUser.UserId is null) return;

        if (appointment.StartDateTime != originalStart || appointment.EndDateTime != originalEnd)
        {
            audit.Add(new AppointmentAuditEntry
            {
                AppointmentId = appointment.Id,
                ChangedByUserId = currentUser.UserId,
                Action = AppointmentAuditEntry.Rescheduled,
                OldStatus = originalStatus,
                NewStatus = appointment.Status
            });
        }

        if (appointment.Status == originalStatus) return;

        var action = appointment.Status == AppointmentStatus.Canceled
            ? AppointmentAuditEntry.Cancelled
            : AppointmentAuditEntry.StatusChange;
        audit.Add(new AppointmentAuditEntry
        {
            AppointmentId = appointment.Id,
            ChangedByUserId = currentUser.UserId,
            Action = action,
            OldStatus = originalStatus,
            NewStatus = appointment.Status
        });
    }
}
