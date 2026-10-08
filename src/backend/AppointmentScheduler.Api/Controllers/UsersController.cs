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

    public UsersController(IUserStore store)
    {
        _store = store;
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
}
