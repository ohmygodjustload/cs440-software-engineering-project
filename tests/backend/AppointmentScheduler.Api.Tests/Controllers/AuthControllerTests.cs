using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Security;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class AuthControllerTests
{
    [Fact]
    public void RegisterUser_CreatesActiveClientAndReturnsToken()
    {
        var controller = CreateController();

        var result = controller.RegisterUser(NewUserRequest("NewClient"));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<RegisterResponse>(created.Value);
        Assert.False(response.RequiresApproval);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.True(response.User.IsClient);
        Assert.True(response.User.IsActive);
    }

    [Fact]
    public void RegisterUser_RejectsDuplicateUsername()
    {
        var controller = CreateController();
        _ = controller.RegisterUser(NewUserRequest("TakenName"));

        var duplicate = controller.RegisterUser(NewUserRequest("takenname"));

        Assert.IsType<ConflictObjectResult>(duplicate.Result);
    }

    [Fact]
    public void RegisterProvider_RequiresServiceType()
    {
        var controller = CreateController();

        var result = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "SamProvider",
            Password = "password123"
        });

        Assert.IsType<ObjectResult>(result.Result);
    }

    [Fact]
    public void RegisterProvider_CreatesInactiveProviderForApproval()
    {
        var controller = CreateController();

        var result = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "SamProvider",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<RegisterResponse>(created.Value);
        Assert.True(response.RequiresApproval);
        Assert.Null(response.Token);
        Assert.True(response.User.IsServiceProvider);
        Assert.False(response.User.IsActive);
    }

    [Fact]
    public void Login_ReturnsTokenForRegisteredActiveUser()
    {
        var controller = CreateController();
        _ = controller.RegisterUser(NewUserRequest("LoginClient"));

        var result = controller.Login(new LoginRequest { Username = "LoginClient", Password = "password123" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<AuthResponse>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.Equal("LoginClient", response.User.Username);
    }

    [Fact]
    public void Login_RejectsPendingProvider()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "PendingProvider",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Beauty]
        });

        var result = controller.Login(new LoginRequest { Username = "PendingProvider", Password = "password123" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    private static AuthController CreateController()
    {
        var options = Options.Create(new JwtOptions
        {
            SigningKey = "unit-test-signing-key-with-at-least-32-bytes"
        });
        var hasher = new PasswordHasher();
        return new AuthController(new InMemoryUserStore(), hasher, new JwtTokenService(options));
    }

    private static RegisterUserRequest NewUserRequest(string username) => new()
    {
        FirstName = "New",
        LastName = "Client",
        Username = username,
        Email = "new@example.com",
        Phone = "555-123-4567",
        Password = "password123"
    };
}
