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
    private readonly PasswordHasher _passwordHasher;
    private readonly JwtTokenService _tokens;

    /// <summary>
    /// Creates a controller that can read/write users, verify password hashes, and issue JWTs.
    /// </summary>
    /// <param name="users">User persistence boundary used for username lookup and registration.</param>
    /// <param name="passwordHasher">Password hashing service used to hash and verify credentials.</param>
    /// <param name="tokens">JWT token service used to create successful authentication responses.</param>
    public AuthController(IUserStore users, PasswordHasher passwordHasher, JwtTokenService tokens)
    {
        _users = users;
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
            return Unauthorized("Account is pending approval.");
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

        var response = new RegisterResponse
        {
            User = created,
            RequiresApproval = true
        };

        return CreatedAtAction(nameof(UsersController.GetById), "Users", new { id = created.Id }, response);
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
