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

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<User>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<User>> List() => Ok(_store.GetAll());

    [HttpGet("{id}")]
    [ProducesResponseType<User>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<User> GetById(string id)
    {
        var item = _store.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }
}