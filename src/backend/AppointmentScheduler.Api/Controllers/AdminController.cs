using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Models;
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
    ICurrentUser currentUser) : ControllerBase
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

        user.FirstName = request.FirstName?.Trim() ?? user.FirstName;
        user.LastName = request.LastName?.Trim() ?? user.LastName;
        user.Email = Normalize(request.Email) ?? user.Email;
        user.Phone = Normalize(request.Phone) ?? user.Phone;

        if (!users.Update(user)) return Conflict("The account was modified. Please retry.");
        activity.Add("ACCOUNT_UPDATED", $"Account updated: {user.Username}", currentUser.UserId, user.Id);
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
    public ActionResult<Appointment> UpdateAppointment(string id, [FromBody] UpdateAppointmentDto request)
    {
        var appointment = appointments.GetById(id);
        if (appointment is null) return NotFound();

        var start = request.StartDateTime ?? appointment.StartDateTime;
        var end = request.EndDateTime ?? appointment.EndDateTime;
        if (end <= start) return BadRequest("EndDateTime must be after StartDateTime.");
        if (request.Title is not null && string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title cannot be empty.");

        appointment.Title = request.Title?.Trim() ?? appointment.Title;
        appointment.Category = request.Category ?? appointment.Category;
        appointment.StartDateTime = start;
        appointment.EndDateTime = end;
        appointment.ProviderId = request.ProviderId?.Trim() ?? appointment.ProviderId;
        appointment.ProviderName = request.ProviderName?.Trim() ?? appointment.ProviderName;
        appointment.Location = request.Location?.Trim() ?? appointment.Location;
        appointment.Notes = request.Notes ?? appointment.Notes;
        appointment.Status = request.Status ?? appointment.Status;

        if (!appointments.Update(appointment)) return Conflict("The appointment was modified. Please retry.");
        activity.Add("APPOINTMENT_UPDATED", $"Appointment updated: {appointment.Title}", currentUser.UserId, appointment.Id);
        return Ok(appointment);
    }

    [HttpGet("activity")]
    public ActionResult<IReadOnlyList<ActivityEntry>> Activity([FromQuery] int limit = 200) =>
        Ok(activity.GetAll(limit));

    [HttpDelete("activity")]
    public IActionResult ClearActivity()
    {
        activity.Clear();
        return NoContent();
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
