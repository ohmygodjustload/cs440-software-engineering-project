using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>Minimal provider catalog for scheduler dropdowns.</summary>
[ApiController]
[Route("api/[controller]")]
public sealed class ProvidersController : ControllerBase
{
    private readonly IProviderStore _store;

    public ProvidersController(IProviderStore store)
    {
        _store = store;
    }

    /// <summary>
    /// Returns the full list of providers used by the scheduler (for dropdowns and lookups).
    /// </summary>
    /// <returns>200 OK with the list of providers.</returns>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<Provider>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<Provider>> List() => Ok(_store.GetAll());

    /// <summary>
    /// Retrieve a provider by identifier.
    /// </summary>
    /// <param name="id">Provider identifier.</param>
    /// <returns>200 OK with the provider, or 404 NotFound when the id does not exist.</returns>
    [HttpGet("{id}")]
    [ProducesResponseType<Provider>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Provider> GetById(string id)
    {
        var item = _store.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Create a new provider.
    /// </summary>
    /// <param name="provider">Provider payload. The <c>Name</c> property is required.</param>
    /// <returns>201 Created with the created provider, or 400 Bad Request for invalid input.</returns>
    [HttpPost]
    [ProducesResponseType<Provider>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Provider> Create([FromBody] Provider provider)
    {
        if (string.IsNullOrWhiteSpace(provider.Name))
        {
            return BadRequest("Name is required.");
        }

        provider.Name = provider.Name.Trim();
        var created = _store.Add(provider);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Delete a provider by identifier.
    /// </summary>
    /// <param name="id">Provider identifier.</param>
    /// <returns>204 NoContent when deleted, or 404 NotFound when the id does not exist.</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete(string id)
    {
        return _store.Remove(id) ? NoContent() : NotFound();
    }
}
