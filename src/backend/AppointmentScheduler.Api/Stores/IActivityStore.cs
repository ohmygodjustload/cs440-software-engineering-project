using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

public interface IActivityStore
{
    void Add(string action, string message, string? actorUserId = null, string? entityId = null);
    IReadOnlyList<ActivityEntry> GetAll(int limit = 200);
    void Clear();
}
