using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AppointmentScheduler.Api.Data;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AppointmentScheduler.Api.Controllers;

[ApiController]
[Authorize(Roles = "ServiceProvider")]
[Route("api/provider-dashboard")]
public sealed class ProviderDashboardController(
    IUserStore users, IAppointmentStore appointments, IServiceProvider services,
    IOptions<MongoDbSettings> options, ILogger<ProviderDashboardController> logger) : ControllerBase {
    [HttpGet("appointments")]
    public ActionResult<IReadOnlyList<Appointment>> GetAppointments() {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var user = users.GetById(userId);
        if (user is null || !user.IsActive || !user.IsServiceProvider) return Forbid();
        try {
            // Old slot endpoints use the user ID; new Mongo slots reference Provider._id.
            var ownedIds = new HashSet<string>(StringComparer.Ordinal) { userId };
            var context = services.GetService<MongoDbContext>();
            if (context is null) {
                ownedIds.Add(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("provider:" + userId)))[..24].ToLowerInvariant());
            } else {
                var rows = context.Database.GetCollection<BsonDocument>(options.Value.ProvidersCollection);
                var filter = Builders<BsonDocument>.Filter.Eq("UserId", userId);
                if (ObjectId.TryParse(userId, out var objectId))
                    filter |= Builders<BsonDocument>.Filter.Eq("UserId", objectId);
                filter &= Builders<BsonDocument>.Filter.Ne("IsDeleted", true);
                foreach (var row in rows.Find(filter).ToList())
                    if (row.TryGetValue("_id", out var id)) ownedIds.Add(id.ToString()!);
            }
            return Ok(appointments.GetAll().Where(item => !item.IsDeleted && ownedIds.Contains(item.ProviderId))
                .OrderBy(item => item.StartDateTime).ToList());
        } catch (Exception ex) {
            logger.LogError(ex, "Provider dashboard load failed for {UserId}", userId);
            return StatusCode(503, "Your appointments could not be loaded. Please retry.");
        }
    }
}
