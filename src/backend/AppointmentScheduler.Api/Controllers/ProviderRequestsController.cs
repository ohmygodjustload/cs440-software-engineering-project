using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Admin review of service provider applications: the open (pending) log, the closed
/// (reviewed) log, and approve/reject decisions with an optional note.
/// </summary>
[ApiController]
[Route("api/provider-requests")]
public sealed class ProviderRequestsController : ControllerBase
{
    private readonly IProviderRequestStore _requests;
    private readonly IUserStore _users;
    private readonly IActivityStore? _activity;

    public ProviderRequestsController(IProviderRequestStore requests, IUserStore users, IActivityStore? activity = null)
    {
        _requests = requests;
        _users = users;
        _activity = activity;
    }

    /// <summary>
    /// List provider requests. Defaults to the open log (requests still to be reviewed).
    /// </summary>
    /// <param name="status">
    /// "pending" (default) returns open requests, "closed" returns reviewed requests,
    /// "all" returns both.
    /// </param>
    /// <returns>200 OK with the matching requests, newest submission first.</returns>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ProviderRequest>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<ProviderRequest>> List([FromQuery] string? status = "pending")
    {
        var normalized = (status ?? "pending").Trim().ToLowerInvariant();

        IEnumerable<ProviderRequest> query = _requests.GetAll();
        query = normalized switch
        {
            "pending" or "open" => query.Where(r => !r.IsReviewed),
            "closed" or "reviewed" => query.Where(r => r.IsReviewed),
            "all" => query,
            _ => query.Where(r => !r.IsReviewed),
        };

        return Ok(query.ToList());
    }

    /// <summary>
    /// Retrieve a single provider request by identifier.
    /// </summary>
    /// <param name="id">Provider request identifier.</param>
    /// <returns>200 OK with the request, or 404 NotFound when missing.</returns>
    [HttpGet("{id}")]
    [ProducesResponseType<ProviderRequest>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<ProviderRequest> GetById(string id)
    {
        var item = _requests.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Approve a provider request. Activates the provider account so they can sign in
    /// and create appointments.
    /// </summary>
    /// <param name="id">Provider request identifier.</param>
    /// <param name="dto">Optional approval note.</param>
    /// <returns>
    /// 200 OK with the reviewed request; 404 NotFound when the request does not exist;
    /// 409 Conflict when the request was already reviewed.
    /// </returns>
    [HttpPost("{id}/approve")]
    [ProducesResponseType<ProviderRequest>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<ProviderRequest> Approve(string id, [FromBody] ProviderRequestDecisionDto? dto = null) =>
        Decide(id, approved: true, dto);

    /// <summary>
    /// Reject a provider request. The account stays inactive; the optional note carries
    /// the rejection reason shown back to the provider.
    /// </summary>
    /// <param name="id">Provider request identifier.</param>
    /// <param name="dto">Optional rejection reason.</param>
    /// <returns>
    /// 200 OK with the reviewed request; 404 NotFound when the request does not exist;
    /// 409 Conflict when the request was already reviewed.
    /// </returns>
    [HttpPost("{id}/reject")]
    [ProducesResponseType<ProviderRequest>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<ProviderRequest> Reject(string id, [FromBody] ProviderRequestDecisionDto? dto = null) =>
        Decide(id, approved: false, dto);

    private ActionResult<ProviderRequest> Decide(string id, bool approved, ProviderRequestDecisionDto? dto)
    {
        var request = _requests.GetById(id);
        if (request is null)
        {
            return NotFound();
        }

        if (request.IsReviewed)
        {
            return Conflict("This request has already been reviewed.");
        }

        request.IsReviewed = true;
        request.IsApproved = approved;
        // Free-text comments are stored as "" rather than null per the DB baseline policy.
        request.Notes = string.IsNullOrWhiteSpace(dto?.Notes) ? string.Empty : dto!.Notes!.Trim();
        request.ReviewedAt = DateTimeOffset.UtcNow;
        _requests.Update(request);

        if (approved)
        {
            var user = _users.GetById(request.UserId);
            if (user is not null && !user.IsActive)
            {
                user.IsActive = true;
                _users.Update(user);
            }
        }

        _activity?.Add(approved ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED",
            $"{(approved ? "Approved" : "Rejected")} provider request for {request.ProviderName}",
            null, request.Id);
        return Ok(request);
    }
}
