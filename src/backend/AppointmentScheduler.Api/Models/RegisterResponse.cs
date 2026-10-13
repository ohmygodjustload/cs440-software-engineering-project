namespace AppointmentScheduler.Api.Models;

public sealed class RegisterResponse
{
    public string? Token { get; init; }

    public DateTimeOffset? ExpiresAt { get; init; }

    public required User User { get; init; }

    public bool RequiresApproval { get; init; }
}
