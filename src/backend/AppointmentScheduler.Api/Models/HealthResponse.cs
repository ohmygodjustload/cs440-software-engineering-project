namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Response body of <c>GET /api/health</c>. The Angular frontend calls this endpoint on the
/// home page to tell the developer whether the API is up and reachable.
/// </summary>
/// <param name="Status">Short machine-readable status of the API, e.g. <c>ok</c>.</param>
/// <param name="Service">Name of the service that produced the response.</param>
/// <param name="Timestamp">UTC instant at which the response was generated.</param>
public sealed record HealthResponse(string Status, string Service, DateTimeOffset Timestamp);
