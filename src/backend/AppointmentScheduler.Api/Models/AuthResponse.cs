namespace AppointmentScheduler.Api.Models;

public sealed class AuthResponse
{
    public required string Token { get; init; }

    public required DateTimeOffset ExpiresAt { get; init; }

    public required User User { get; init; }
}
