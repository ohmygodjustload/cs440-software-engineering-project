using System.Reflection;
using System.IO;

const string AngularCorsPolicy = "AngularClient";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    // Accept both "Medical" and 0 for AppointmentCategory / AppointmentStatus.
    // Numbers keep working (back-compat with the .http file); names fix the 400s.
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddOpenApi();

// Register Swagger/OpenAPI generators so all controller endpoints are documented
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Include XML comments from this assembly (requires GenerateDocumentationFile in the project file)
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

// MongoDB settings bind from the "MongoDb" section, with env-var override:
//   MongoDb__ConnectionString=mongodb+srv://...   (double underscore = section separator)
// Order of precedence: env var > User Secrets > appsettings.Development.json > appsettings.json.
// NOTE: ASP.NET Core maps BOTH "MongoDb:ConnectionString" and "MongoDb__ConnectionString"
// env vars onto this section automatically. We also accept the ALL-CAPS legacy name
// MONGODB__CONNECTIONSTRING explicitly for backwards compat with older scripts/docs.
builder.Services.Configure<AppointmentScheduler.Api.Data.MongoDbSettings>(
    builder.Configuration.GetSection(AppointmentScheduler.Api.Data.MongoDbSettings.SectionName));

var mongoConnectionString = builder.Configuration.GetValue<string>("MongoDb:ConnectionString")
    ?? Environment.GetEnvironmentVariable("MongoDb__ConnectionString")
    ?? Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING");

if (!string.IsNullOrWhiteSpace(mongoConnectionString))
{
    // Atlas path: single shared client/database + Mongo-backed stores.
    builder.Services.AddSingleton<AppointmentScheduler.Api.Data.MongoDbContext>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IAppointmentStore, AppointmentScheduler.Api.Stores.MongoAppointmentStore>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IProviderStore, AppointmentScheduler.Api.Stores.MongoProviderStore>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IUserStore, AppointmentScheduler.Api.Stores.MongoUserStore>();
}
else
{
    // Local default: in-memory stores so the frontend can integrate with no secrets.
    // They are singletons so data survives across requests while the API runs.
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IAppointmentStore, AppointmentScheduler.Api.Stores.InMemoryAppointmentStore>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IProviderStore, AppointmentScheduler.Api.Stores.InMemoryProviderStore>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IUserStore, AppointmentScheduler.Api.Stores.InMemoryUserStore>();
}

// The Angular dev server (http://localhost:4200) is a different origin than the API, so browser
// requests that do not go through the `ng serve` proxy need an explicit CORS entry. Origins are
// configurable so each environment can list its own frontend URLs ("Cors:AllowedOrigins").
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
    options.AddPolicy(AngularCorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

// Global safety net: a Mongo outage must surface as 503 with NO stack trace,
// not a 500 + DeveloperExceptionPage dump. Read-only BAAAM writes surface as
// 405. Controllers stay clean; this is the single place these are translated.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex) when (
        ex is MongoDB.Driver.MongoException
        || ex is TimeoutException
        || ex is NotSupportedException)
    {
        var readOnly = ex is NotSupportedException;
        context.Response.StatusCode = readOnly
            ? StatusCodes.Status405MethodNotAllowed
            : StatusCodes.Status503ServiceUnavailable;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            status = readOnly ? "read-only" : "unhealthy",
            store = "mongodb",
            error = readOnly
                ? "BAAAM collections are read-only from this API. Writes are disabled to protect team data."
                : "Database unavailable. Check the connection string, IP access list, and network, then retry."
        });
    }
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AppointmentScheduler API v1");
        options.RoutePrefix = "swagger"; // UI at /swagger
    });
}

app.UseCors(AngularCorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
