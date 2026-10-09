using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>In-memory user store for no-secret local dev. Mirrors the BAAAM seed shape.</summary>
public sealed class InMemoryUserStore : IUserStore
{
    private readonly List<User> _items = new()
    {
        new User { Id = "6abc1939a313dfdf8ecc0265", FirstName = "John", LastName = "Smith", Username = "JohnSmith123", IsProvider = true },
        new User { Id = "6abc20bda313dfdf8ecc0286", FirstName = "Jane", LastName = "Porter", Username = "JanePorter123", IsClient = true },
    };

    public IReadOnlyList<User> GetAll() =>
        _items.OrderBy(u => u.Username).ToList();

    public User? GetById(string id) =>
        _items.FirstOrDefault(u => u.Id == id);
}
