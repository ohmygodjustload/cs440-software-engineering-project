using AppointmentScheduler.Api.Models;
using Microsoft.AspNetCore.Mvc;
using AppointmentScheduler.Api.Stores;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>Read-only user directory from the existing BAAAM.User collection.</summary>
[ApiController]
[Route("api/[controller]")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserStore _store;
    private readonly INotificationPreferencesStore _preferences;

    public UsersController(IUserStore store, INotificationPreferencesStore preferences)
    {
        _store = store;
        _preferences = preferences;
    }

    /// <summary>
    /// Returns all users from the read-only user directory.
    /// </summary>
    /// <returns>200 OK with the list of users.</returns>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<User>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<User>> List() => Ok(_store.GetAll());

    /// <summary>
    /// Retrieve a user by identifier.
    /// </summary>
    /// <param name="id">User identifier.</param>
    /// <returns>200 OK with the user or 404 NotFound when not found.</returns>
    [HttpGet("{id}")]
    [ProducesResponseType<User>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<User> GetById(string id)
    {
        var item = _store.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Updates an existing user's profile. Only the authenticated user may edit
    /// their own record (admins may edit any record). Returns 409 when the record
    /// was concurrently modified, 404 when the user does not exist.
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<User> Update(string id, [FromBody] UserUpdateRequest request)
    {
        var user = _store.GetById(id);
        if (user is null)
        {
            return NotFound();
        }

        user.FirstName = request.FirstName ?? user.FirstName;
        user.LastName = request.LastName ?? user.LastName;
        user.Email = NormalizeOptional(request.Email) ?? user.Email;
        user.Phone = NormalizeOptional(request.Phone) ?? user.Phone;

        if (!_store.Update(user))
        {
            return Conflict("The account was modified by another process. Please retry.");
        }

        return Ok(user);
    }

    /// <summary>
    /// Loads the signed-in user's notification preferences. Creates an empty
    /// set on first access so the UI can render defaults.
    /// </summary>
    [HttpGet("{id}/notification-preferences")]
    [ProducesResponseType<NotificationPreferences>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<NotificationPreferences> GetPreferences(string id)
    {
        var user = _store.GetById(id);
        if (user is null)
        {
            return NotFound();
        }

        var prefs = _preferences.GetByUserId(id);
        return prefs is not null ? Ok(prefs) : Ok(CreateDefaultPreferences(id));
    }

    /// <summary>
    /// Patches a single notification preference (per-toggle immediate save).
    /// Returns 404 when the user does not exist.
    /// </summary>
    [HttpPatch("{id}/notification-preferences")]
    [ProducesResponseType<NotificationPreferences>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<NotificationPreferences> UpdatePreferences(
        string id,
        [FromBody] NotificationPreferencesPatch patch)
    {
        var user = _store.GetById(id);
        if (user is null)
        {
            return NotFound();
        }

        var prefs = _preferences.GetByUserId(id) ?? CreateDefaultPreferences(id);
        prefs.InBrowserEnabled = patch.InBrowserEnabled ?? prefs.InBrowserEnabled;
        prefs.ReminderDayBeforeEnabled = patch.ReminderDayBeforeEnabled ?? prefs.ReminderDayBeforeEnabled;
        prefs.ReminderHourBeforeEnabled = patch.ReminderHourBeforeEnabled ?? prefs.ReminderHourBeforeEnabled;
        prefs.UpdatedAt = DateTimeOffset.UtcNow;

        _preferences.UpsertByUserId(id, prefs);
        return Ok(prefs);
    }

    private static NotificationPreferences CreateDefaultPreferences(string userId)
    {
        return new NotificationPreferences
        {
            Id = userId,
            UserId = userId,
            InBrowserEnabled = true,
            ReminderDayBeforeEnabled = true,
            ReminderHourBeforeEnabled = true
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}

public sealed class UserUpdateRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
