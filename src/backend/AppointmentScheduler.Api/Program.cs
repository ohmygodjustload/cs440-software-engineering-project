const string AngularCorsPolicy = "AngularClient";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// MongoDB settings bind from the "MongoDb" section, with env-var override:
//   MONGODB__CONNECTIONSTRING=mongodb+srv://...   (double underscore = section separator)
// Order of precedence: env var > User Secrets > appsettings.Development.json > appsettings.json.
builder.Services.Configure<AppointmentScheduler.Api.Data.MongoDbSettings>(
    builder.Configuration.GetSection(AppointmentScheduler.Api.Data.MongoDbSettings.SectionName));

var mongoConnectionString = builder.Configuration.GetValue<string>("MongoDb:ConnectionString")
    ?? Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING");

if (!string.IsNullOrWhiteSpace(mongoConnectionString))
{
    // Atlas path: single shared client/database + Mongo-backed stores.
    builder.Services.AddSingleton<AppointmentScheduler.Api.Data.MongoDbContext>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IAppointmentStore, AppointmentScheduler.Api.Stores.MongoAppointmentStore>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IProviderStore, AppointmentScheduler.Api.Stores.MongoProviderStore>();
}
else
{
    // Local default: in-memory stores so the frontend can integrate with no secrets.
    // They are singletons so data survives across requests while the API runs.
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IAppointmentStore, AppointmentScheduler.Api.Stores.InMemoryAppointmentStore>();
    builder.Services.AddSingleton<AppointmentScheduler.Api.Stores.IProviderStore, AppointmentScheduler.Api.Stores.InMemoryProviderStore>();
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(AngularCorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
