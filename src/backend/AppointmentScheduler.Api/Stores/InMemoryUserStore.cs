using AppointmentScheduler.Api.Models;

namespace AppointmentScheduler.Api.Stores;

/// <summary>In-memory user store for no-secret local dev. Mirrors the BAAAM seed shape.</summary>
public sealed class InMemoryUserStore : IUserStore
{
    private readonly object _gate = new();
    private readonly List<User> _items = new()
    {
        new User
        {
            Id = SeedIds.ProviderUser, FirstName = "John", LastName = "Smith", Username = "JohnSmith123",
            Email = "test@gmail.com", Phone = "123-123-1234",
            IsServiceProvider = true, IsActive = true,
            ServiceTypes = [AppointmentCategory.Medical],
        },
        new User
        {
            Id = SeedIds.ClientUser, FirstName = "Jane", LastName = "Porter", Username = "JanePorter123",
            Email = "test2@gmail.com", Phone = "456-456-4567", IsClient = true, IsActive = true,
        },
        new User
        {
            Id = SeedIds.AdminUser, FirstName = "Ada", LastName = "Admin", Username = "AdaAdmin123",
            Email = "admin@example.com", IsAdmin = true, IsActive = true,
        },
    };

    public IReadOnlyList<User> GetAll() =>
        _items.OrderBy(u => u.Username).ToList();

    public User? GetById(string id) =>
        _items.FirstOrDefault(u => u.Id == id);

    public User? GetByUsername(string username) =>
        _items.FirstOrDefault(u => string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase));

    public User Add(User user)
    {
        lock (_gate)
        {
            if (GetByUsername(user.Username) is not null)
            {
                throw new InvalidOperationException("Username already exists.");
            }

            user.Id = string.IsNullOrWhiteSpace(user.Id) ? Guid.NewGuid().ToString("N") : user.Id;
            _items.Add(user);
            return user;
        }
    }

    public bool Update(User user)
    {
        lock (_gate)
        {
            var index = _items.FindIndex(u => u.Id == user.Id);
            if (index < 0)
            {
                return false;
            }

            _items[index] = user;
            return true;
        }
    }
}
