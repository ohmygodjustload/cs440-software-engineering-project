namespace AppointmentScheduler.Api.Data;

/// <summary>
/// Strongly-typed MongoDB settings, bound from the "MongoDb" config section.
/// Secrets NEVER live in appsettings.json — see appsettings.Development.json
/// (git-ignored), User Secrets, or the MONGODB__CONNECTIONSTRING env var.
/// </summary>
public sealed class MongoDbSettings
{
    public const string SectionName = "MongoDb";

    /// <summary>Atlas SRV string, e.g. mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net</summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>Database name, e.g. appointment_scheduler.</summary>
    public string DatabaseName { get; set; } = "appointment_scheduler";

    /// <summary>Collection names. Keep defaults unless you have a reason to change them.</summary>
    public string AppointmentsCollection { get; set; } = "appointments";

    public string ProvidersCollection { get; set; } = "providers";
}
