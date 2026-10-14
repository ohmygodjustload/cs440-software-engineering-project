using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Security;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class AuthControllerTests
{
    private readonly InMemoryUserStore _users = new();
    private readonly InMemoryProviderRequestStore _providerRequests = new();

    private AuthController CreateController() =>
        new(
            _users,
            _providerRequests,
            new PasswordHasher(),
            new JwtTokenService(Options.Create(new JwtOptions
            {
                SigningKey = "unit-test-signing-key-with-at-least-32-bytes"
            })));

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

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.Equal(
            "Your request is yet to be reviewed by an admin. Please try again later.",
            unauthorized.Value);
    }

    [Fact]
    public void Login_ShowsRejectionReasonForRejectedProvider()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "RejectedProvider",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Beauty]
        });

        var request = Assert.Single(_providerRequests.GetAll());
        request.IsReviewed = true;
        request.IsApproved = false;
        request.Notes = "License number could not be verified.";
        _providerRequests.Update(request);

        var result = controller.Login(new LoginRequest { Username = "RejectedProvider", Password = "password123" });

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.Equal(
            "Your service provider request was rejected by an admin. Reason: License number could not be verified.",
            unauthorized.Value);
    }

    [Fact]
    public void RegisterProvider_FilesOpenProviderRequest()
    {
        var controller = CreateController();

        var result = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "RequestFiled",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical, AppointmentCategory.Fitness],
            MedicalCredentials = new ServiceCredentialRequest { Info = "MD, State University" }
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<RegisterResponse>(created.Value);

        var request = Assert.Single(_providerRequests.GetAll());
        Assert.Equal(response.User.Id, request.UserId);
        Assert.Equal("Sam Provider", request.ProviderName);
        Assert.False(request.IsReviewed);
        Assert.False(request.IsApproved);
        Assert.Equal(string.Empty, request.Notes);
        Assert.Contains(AppointmentCategory.Medical, request.ServiceTypes);
        Assert.Contains(AppointmentCategory.Fitness, request.ServiceTypes);
        Assert.Equal("MD, State University", request.MedicalCredentials?.Info);
    }

    [Fact]
    public void ResubmitProvider_FilesNewOpenRequestForRejectedProvider()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "RejectedPro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        var rejected = Assert.Single(_providerRequests.GetAll());
        rejected.IsReviewed = true;
        rejected.IsApproved = false;
        rejected.Notes = "License could not be verified.";
        _providerRequests.Update(rejected);

        var result = controller.ResubmitProvider(new RegisterProviderRequest
        {
            FirstName = "Samuel",
            LastName = "Provider",
            Username = "RejectedPro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Beauty],
            BeautyCredentials = new ServiceCredentialRequest { Info = "Cosmetology license #12345" }
        });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<RegisterResponse>(ok.Value);
        Assert.True(response.RequiresApproval);
        Assert.Null(response.Token);

        // The account was updated in place (no duplicate inactive user) and a fresh open request filed.
        var requests = _providerRequests.GetAll();
        Assert.Equal(2, requests.Count);
        var open = requests.Single(r => !r.IsReviewed);
        Assert.Equal("Samuel Provider", open.ProviderName);
        Assert.Contains(AppointmentCategory.Beauty, open.ServiceTypes);
        Assert.Equal("Cosmetology license #12345", open.BeautyCredentials?.Info);

        var user = _users.GetByUsername("RejectedPro")!;
        Assert.False(user.IsActive);
        Assert.Equal("Samuel", user.FirstName);
        Assert.Contains(AppointmentCategory.Beauty, user.ServiceTypes);
    }

    [Fact]
    public void ResubmitProvider_RejectsInvalidCredentials()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "RejectedPro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        var rejected = Assert.Single(_providerRequests.GetAll());
        rejected.IsReviewed = true;
        rejected.IsApproved = false;
        _providerRequests.Update(rejected);

        var result = controller.ResubmitProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "RejectedPro",
            Password = "wrong-password",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public void ResubmitProvider_RejectsNonProviderAccount()
    {
        var controller = CreateController();
        _ = controller.RegisterUser(NewUserRequest("SomeClient"));

        var result = controller.ResubmitProvider(new RegisterProviderRequest
        {
            FirstName = "New",
            LastName = "Client",
            Username = "SomeClient",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public void ResubmitProvider_RejectsActiveAccount()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "ActivePro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        var rejected = Assert.Single(_providerRequests.GetAll());
        rejected.IsReviewed = true;
        rejected.IsApproved = false;
        _providerRequests.Update(rejected);

        var user = _users.GetByUsername("ActivePro")!;
        user.IsActive = true;
        _users.Update(user);

        var result = controller.ResubmitProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "ActivePro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public void ResubmitProvider_RejectsWhenStillPendingReview()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "PendingPro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        // The single request is still open (not reviewed), so re-submission is not allowed.
        var result = controller.ResubmitProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "PendingPro",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Medical]
        });

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public void Login_SucceedsAfterAdminApprovesRequest()
    {
        var controller = CreateController();
        _ = controller.RegisterProvider(new RegisterProviderRequest
        {
            FirstName = "Sam",
            LastName = "Provider",
            Username = "ApprovedProvider",
            Password = "password123",
            ServiceTypes = [AppointmentCategory.Fitness]
        });

        var request = Assert.Single(_providerRequests.GetAll());
        request.IsReviewed = true;
        request.IsApproved = true;
        _providerRequests.Update(request);

        var user = _users.GetByUsername("ApprovedProvider")!;
        user.IsActive = true;
        _users.Update(user);

        var result = controller.Login(new LoginRequest { Username = "ApprovedProvider", Password = "password123" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.False(string.IsNullOrWhiteSpace(Assert.IsType<AuthResponse>(ok.Value).Token));
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
