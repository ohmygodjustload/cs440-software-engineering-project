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
[Authorize]
[Route("api/statistics")]
public sealed class StatisticsController(
    IUserStore users,
    IAppointmentStore appointments,
    IAppointmentTypeStore appointmentTypes,
    IServiceProvider services,
    IOptions<MongoDbSettings> options) : ControllerBase
{
    [HttpGet("appointments")]
    public IActionResult GetAppointments([FromQuery] string role)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = users.GetById(userId);
        if (user is null || !user.IsActive || user.IsAdmin)
            return Forbid();

        var history = appointments.GetAllIncludingDeleted();

        if (role == "client")
        {
            if (!user.IsClient) return Forbid();

            return Ok(history
                .Where(item => item.UserId == userId)
                .OrderBy(item => item.StartDateTime)
                .ToList());
        }

        if (role != "provider")
            return BadRequest("Role must be client or provider.");

        if (!user.IsServiceProvider) return Forbid();

        var ownedIds = new HashSet<string>(StringComparer.Ordinal)
        {
            userId
        };

        var context = services.GetService<MongoDbContext>();

        if (context is null)
        {
            ownedIds.Add(Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes("provider:" + userId))
            )[..24].ToLowerInvariant());
        }
        else
        {
            var rows = context.Database.GetCollection<BsonDocument>(
                options.Value.ProvidersCollection);

            var filter = Builders<BsonDocument>.Filter.Eq("UserId", userId);

            if (ObjectId.TryParse(userId, out var objectId))
                filter |= Builders<BsonDocument>.Filter.Eq("UserId", objectId);

            filter &= Builders<BsonDocument>.Filter.Ne("IsDeleted", true);

            foreach (var row in rows.Find(filter).ToList())
            {
                if (row.TryGetValue("_id", out var id))
                    ownedIds.Add(id.ToString()!);
            }
        }

        var ownedTypeIds = appointmentTypes.GetByProviderId(userId)
            .Select(type => type.Id)
            .ToHashSet(StringComparer.Ordinal);

        return Ok(history
            .Where(item =>
                ownedIds.Contains(item.ProviderId) ||
                ownedTypeIds.Contains(item.AppointmentTypeId ?? ""))
            .OrderBy(item => item.StartDateTime)
            .ToList());
    }
}