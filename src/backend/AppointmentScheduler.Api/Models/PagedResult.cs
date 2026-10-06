namespace AppointmentScheduler.Api.Models;

/// <summary>Standard paged envelope used by list endpoints.</summary>
/// <typeparam name="T">Item type.</typeparam>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
