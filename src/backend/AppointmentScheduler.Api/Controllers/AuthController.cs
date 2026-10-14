using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Security;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Controllers;

/// <summary>
/// Handles username/password authentication, account registration, and JWT issuance.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IUserStore _users;
    private readonly IProviderRequestStore _providerRequests;
    private readonly PasswordHasher _passwordHasher;
    private readonly JwtTokenService _tokens;

    /// <summary>
    /// Creates a controller that can read/write users, verify password hashes, and issue JWTs.
    /// </summary>
    /// <param name="users">User persistence boundary used for username lookup and registration.</param>
    /// <param name="providerRequests">Provider request persistence boundary used to file approval requests.</param>
    /// <param name="passwordHasher">Password hashing service used to hash and verify credentials.</param>
    /// <param name="tokens">JWT token service used to create successful authentication responses.</param>
    public AuthController(
        IUserStore users,
        IProviderRequestStore providerRequests,
        PasswordHasher passwordHasher,
        JwtTokenService tokens)
    {
        _users = users;
        _providerRequests = providerRequests;
        _passwordHasher = passwordHasher;
        _tokens = tokens;
    }

    /// <summary>
    /// Authenticate an active account with username and password.
    /// </summary>
    /// <param name="request">Login payload containing the username and plaintext password supplied by the user.</param>
    /// <returns>
    /// 200 OK with a JWT, expiration timestamp, and public user payload when credentials are valid;
    /// 401 Unauthorized when credentials are invalid or the account is pending approval.
    /// </returns>
    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<AuthResponse> Login([FromBody] LoginRequest request)
    {
        var username = request.Username.Trim();
        var user = _users.GetByUsername(username);
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash) || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid username or password.");
        }

        if (!user.IsActive)
        {
            return Unauthorized(GetInactiveAccountMessage(user));
        }

        return Ok(_tokens.CreateToken(user));
    }

    /// <summary>
    /// Register a normal client account and sign it in immediately.
    /// </summary>
    /// <param name="request">
    /// Registration payload containing required name, username, and password fields plus optional contact information.
    /// </param>
    /// <returns>
    /// 201 Created with the created public user payload and JWT; 409 Conflict when the username is already taken.
    /// </returns>
    [HttpPost("register")]
    [ProducesResponseType<RegisterResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<RegisterResponse> RegisterUser([FromBody] RegisterUserRequest request)
    {
        var user = BuildUser(request);
        user.IsClient = true;
        user.IsActive = true;

        var created = TryAddUser(user);
        if (created is null)
        {
            return Conflict("Username is already taken.");
        }

        var token = _tokens.CreateToken(created);
        var response = new RegisterResponse
        {
            Token = token.Token,
            ExpiresAt = token.ExpiresAt,
            User = created,
            RequiresApproval = false
        };

        return CreatedAtAction(nameof(UsersController.GetById), "Users", new { id = created.Id }, response);
    }

    /// <summary>
    /// Register a service provider account for later admin approval.
    /// </summary>
    /// <param name="request">
    /// Registration payload containing base account fields, at least one service type, and optional credential details.
    /// </param>
    /// <returns>
    /// 201 Created with the pending provider account and <c>RequiresApproval = true</c>;
    /// 400 Bad Request when no service type is selected;
    /// 409 Conflict when the username is already taken.
    /// </returns>
    [HttpPost("register/provider")]
    [ProducesResponseType<RegisterResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<RegisterResponse> RegisterProvider([FromBody] RegisterProviderRequest request)
    {
        var serviceTypes = request.ServiceTypes.Distinct().ToList();
        if (serviceTypes.Count == 0)
        {
            ModelState.AddModelError(nameof(request.ServiceTypes), "At least one service type is required.");
            return ValidationProblem(ModelState);
        }

        var user = BuildUser(request);
        user.IsServiceProvider = true;
        user.IsActive = false;
        user.ServiceTypes = serviceTypes;
        user.MedicalCredentials = ToCredential(request.MedicalCredentials);
        user.BeautyCredentials = ToCredential(request.BeautyCredentials);
        user.FitnessCredentials = ToCredential(request.FitnessCredentials);

        var created = TryAddUser(user);
        if (created is null)
        {
            return Conflict("Username is already taken.");
        }

        // File an open provider request so admins can review and approve/reject it.
        _providerRequests.Add(new ProviderRequest
        {
            UserId = created.Id,
            ProviderName = $"{created.FirstName} {created.LastName}".Trim(),
            ServiceTypes = serviceTypes,
            MedicalCredentials = created.MedicalCredentials,
            BeautyCredentials = created.BeautyCredentials,
            FitnessCredentials = created.FitnessCredentials,
            IsReviewed = false,
            IsApproved = false,
            Notes = string.Empty,
            SubmittedAt = DateTimeOffset.UtcNow
        });

        var response = new RegisterResponse
        {
            User = created,
            RequiresApproval = true
        };

        return CreatedAtAction(nameof(UsersController.GetById), "Users", new { id = created.Id }, response);
    }

    /// <summary>
    /// Re-submit a rejected provider application. The provider authenticates with their existing
    /// (still inactive) username and password, may update their profile and credentials, and a fresh
    /// open <see cref="ProviderRequest"/> is filed against the same account. Re-using the account
    /// means a rejected application does not leave a duplicate inactive user behind.
    /// </summary>
    /// <param name="request">
    /// The provider's full application. <see cref="RegisterProviderRequest.Username"/> and
    /// <see cref="RegisterProviderRequest.Password"/> authenticate the existing account; the remaining
    /// fields update the profile that is snapshotted into the new request.
    /// </param>
    /// <returns>
    /// 200 OK with the pending provider account and <c>RequiresApproval = true</c>;
    /// 400 Bad Request when no service type is selected or the account is not a provider;
    /// 401 Unauthorized when the credentials are invalid;
    /// 409 Conflict when the account is already active or the latest request is not a rejection
    /// (for example, still pending review).
    /// </returns>
    [HttpPost("resubmit/provider")]
    [ProducesResponseType<RegisterResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult<RegisterResponse> ResubmitProvider([FromBody] RegisterProviderRequest request)
    {
        var username = request.Username.Trim();
        var user = _users.GetByUsername(username);
        if (user is null
            || string.IsNullOrWhiteSpace(user.PasswordHash)
            || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid username or password.");
        }

        if (!user.IsServiceProvider)
        {
            return BadRequest("This account is not a service provider.");
        }

        if (user.IsActive)
        {
            return Conflict("This account is already active.");
        }

        // Only a rejected request may be re-submitted. A still-pending request is under review
        // and an approved request would have activated the account (handled above).
        var latest = _providerRequests.GetLatestByUserId(user.Id);
        if (latest is null || !latest.IsReviewed || latest.IsApproved)
        {
            return Conflict("You can only re-submit after an admin rejects your request.");
        }

        var serviceTypes = request.ServiceTypes.Distinct().ToList();
        if (serviceTypes.Count == 0)
        {
            ModelState.AddModelError(nameof(request.ServiceTypes), "At least one service type is required.");
            return ValidationProblem(ModelState);
        }

        // Update the existing account in place (username and password are unchanged) so rejected
        // applications do not accumulate duplicate inactive users in the database.
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = NormalizeOptional(request.Email);
        user.Phone = NormalizeOptional(request.Phone);
        user.ServiceTypes = serviceTypes;
        user.MedicalCredentials = ToCredential(request.MedicalCredentials);
        user.BeautyCredentials = ToCredential(request.BeautyCredentials);
        user.FitnessCredentials = ToCredential(request.FitnessCredentials);
        _users.Update(user);

        // File a brand-new open request so admins review the updated application.
        _providerRequests.Add(new ProviderRequest
        {
            UserId = user.Id,
            ProviderName = $"{user.FirstName} {user.LastName}".Trim(),
            ServiceTypes = serviceTypes,
            MedicalCredentials = user.MedicalCredentials,
            BeautyCredentials = user.BeautyCredentials,
            FitnessCredentials = user.FitnessCredentials,
            IsReviewed = false,
            IsApproved = false,
            Notes = string.Empty,
            SubmittedAt = DateTimeOffset.UtcNow
        });

        return Ok(new RegisterResponse
        {
            User = user,
            RequiresApproval = true
        });
    }

    /// <summary>
    /// Explains why a provider cannot sign in yet. Rejected accounts surface the admin's
    /// rejection note; everything else is treated as waiting on review.
    /// </summary>
    private string GetInactiveAccountMessage(User user)
    {
        if (user.IsServiceProvider)
        {
            var latest = _providerRequests.GetLatestByUserId(user.Id);
            if (latest is { IsReviewed: true, IsApproved: false })
            {
                return string.IsNullOrWhiteSpace(latest.Notes)
                    ? "Your service provider request was rejected by an admin. Please contact an administrator for details."
                    : $"Your service provider request was rejected by an admin. Reason: {latest.Notes}";
            }

            return "Your request is yet to be reviewed by an admin. Please try again later.";
        }

        return "Account is pending approval.";
    }

    private User BuildUser(RegisterUserRequest request) => new()
    {
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        Username = request.Username.Trim(),
        Email = NormalizeOptional(request.Email),
        Phone = NormalizeOptional(request.Phone),
        PasswordHash = _passwordHasher.Hash(request.Password)
    };

    private User? TryAddUser(User user)
    {
        if (_users.GetByUsername(user.Username) is not null)
        {
            return null;
        }

        try
        {
            return _users.Add(user);
        }
        catch (InvalidOperationException)
        {
            return null;
        }
    }

    private static ServiceCredential? ToCredential(ServiceCredentialRequest? request)
    {
        if (request is null)
        {
            return null;
        }

        return new ServiceCredential
        {
            Info = NormalizeOptional(request.Info),
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
