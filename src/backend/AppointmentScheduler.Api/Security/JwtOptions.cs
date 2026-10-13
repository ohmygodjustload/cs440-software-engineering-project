namespace AppointmentScheduler.Api.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "BAAAM Scheduling";

    public string Audience { get; set; } = "BAAAM Scheduling Client";

    public string SigningKey { get; set; } = string.Empty;

    public int ExpirationMinutes { get; set; } = 60;
}
