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

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<Provider>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<Provider>> List() => Ok(_store.GetAll());

    [HttpGet("{id}")]
    [ProducesResponseType<Provider>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Provider> GetById(string id)
    {
        var item = _store.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

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

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete(string id)
    {
        return _store.Remove(id) ? NoContent() : NotFound();
    }
}
