namespace AppointmentScheduler.Api.Models;

/// <summary>
/// One immutable row in the appointment audit ledger (CREATED, RESCHEDULED, STATUS_CHANGE, CANCELLED).
/// </summary>
public sealed class AppointmentAuditEntry
{
    public const string Created = "CREATED";
    public const string Rescheduled = "RESCHEDULED";
    public const string StatusChange = "STATUS_CHANGE";
    public const string Cancelled = "CANCELLED";

    public static readonly HashSet<string> KnownActions = new(StringComparer.OrdinalIgnoreCase)
    {
        Created, Rescheduled, StatusChange, Cancelled
    };

    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string AppointmentId { get; set; } = string.Empty;
    public string ChangedByUserId { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public string Action { get; set; } = string.Empty;
    public AppointmentStatus? OldStatus { get; set; }
    public AppointmentStatus? NewStatus { get; set; }
}

/// <summary>Admin-facing audit row with display names resolved from related stores.</summary>
public sealed class AppointmentAuditListItem
{
    public string Id { get; set; } = string.Empty;
    public string AppointmentId { get; set; } = string.Empty;
    public string? AppointmentTitle { get; set; }
    public string ChangedByUserId { get; set; } = string.Empty;
    public string? ChangedByName { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Action { get; set; } = string.Empty;
    public AppointmentStatus? OldStatus { get; set; }
    public AppointmentStatus? NewStatus { get; set; }
}
