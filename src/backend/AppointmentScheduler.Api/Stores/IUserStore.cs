using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>Storage abstraction for users (BAAAM.User). Read-only against team data.</summary>
public interface IUserStore
{
    IReadOnlyList<User> GetAll();
    User? GetById(string id);
    User? GetByUsername(string username);
    User Add(User user);

    /// <summary>Persists changes to an existing user. Returns false when the id is unknown.</summary>
    bool Update(User user);
}
