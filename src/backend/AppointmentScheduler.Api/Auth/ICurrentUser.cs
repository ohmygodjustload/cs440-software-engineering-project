namespace AppointmentScheduler.Api.Auth;

public interface ICurrentUser {
    string? UserId { get; }
}

public sealed class DevCurrentUser(IHttpContextAccessor http, IConfiguration config, IHostEnvironment env)
    : ICurrentUser {
    public string? UserId {
        get {
            var ctx = http.HttpContext;
            var claim = ctx?.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrWhiteSpace(claim)) return claim;

            if (!env.IsDevelopment()) return null;

            var header = ctx?.Request.Headers["X-User-Id"].FirstOrDefault();

            return !string.IsNullOrEmpty(header) ? header : config["DevUser:UserId"];
        }
    }
}
