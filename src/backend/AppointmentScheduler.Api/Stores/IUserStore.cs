using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Storage abstraction for users (BAAAM.User). Read-only against team data.</summary>
public interface IUserStore
{
    IReadOnlyList<User> GetAll();
    User? GetById(string id);
}
