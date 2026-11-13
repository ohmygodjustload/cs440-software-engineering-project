using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public interface IAppointmentAuditStore
{
    void Add(AppointmentAuditEntry entry);

    /// <summary>Newest first. Optional filters on UTC timestamp range and action name.</summary>
    IReadOnlyList<AppointmentAuditEntry> Query(
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        string? action = null,
        int limit = 200);
}
