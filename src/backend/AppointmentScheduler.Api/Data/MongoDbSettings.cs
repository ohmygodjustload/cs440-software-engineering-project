namespace AppointmentScheduler.Api.Data;

/// <summary>
/// Strongly-typed MongoDB settings, bound from the "MongoDb" config section.
/// Secrets NEVER live in appsettings.json — see appsettings.Development.json
/// (git-ignored), User Secrets, or the MONGODB__CONNECTIONSTRING env var.
/// Collection defaults match the live BAAAM database (Atlas Browse Collections):
/// Appointment, Provider, User, AppointmentType, Location, Status.
/// </summary>
public sealed class MongoDbSettings
{
    public const string SectionName = "MongoDb";

    /// <summary>Atlas SRV string, e.g. mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net</summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>Database name. Team database is "BAAAM" (Atlas Browse Collections).</summary>
    public string DatabaseName { get; set; } = "BAAAM";

    /// <summary>
    /// Collection names. These MUST match the existing BAAAM collections.
    /// Never create new collections; point at these.
    /// </summary>
    public string AppointmentsCollection { get; set; } = "Appointment";

    public string ProvidersCollection { get; set; } = "Provider";

    public string UsersCollection { get; set; } = "User";

    public string AppointmentTypesCollection { get; set; } = "AppointmentType";

    public string LocationsCollection { get; set; } = "Location";

    public string StatusesCollection { get; set; } = "Status";
}
