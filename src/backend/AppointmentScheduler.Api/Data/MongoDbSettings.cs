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

    /// <summary>Database name. Team database is "BAAAM" (Atlas Browse Collections).</summary>
    public string DatabaseName { get; set; } = "BAAAM";

    /// <summary>
    /// Collection names. Team collections are the existing BAAAM ones:
    /// "Appointment" and "ServiceProvider". Never create new collections;
    /// point at these.
    /// </summary>
    public string AppointmentsCollection { get; set; } = "Appointment";

    public string ProvidersCollection { get; set; } = "ServiceProvider";
}
