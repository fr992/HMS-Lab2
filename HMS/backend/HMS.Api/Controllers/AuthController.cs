using HMS.Application.Abstractions.Identity;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HMS.Contracts.Identity;
using HMS.Api.Logging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            using var failedScope = BeginIamScope("LoginFailed", null);

            _logger.LogWarning(
                "IAM login failed for login hash {LoginIdentifierHash}.",
                HashLoginIdentifier(request.UserNameOrEmail));

            return Unauthorized();
        }

        using var successScope = BeginIamScope("LoginSucceeded", result.UserId);

        _logger.LogInformation(
            "IAM login succeeded for user {ActorUserId} with {RoleCount} role(s).",
            result.UserId,
            result.Roles.Count);

        return Ok(result);
    }
    
    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshTokenAsync(request.RefreshToken, cancellationToken);

        if (result is null)
        {
            using var failedScope = BeginIamScope("RefreshTokenFailed", null);

            _logger.LogWarning("IAM refresh token exchange failed.");

            return Unauthorized();
        }

        using var successScope = BeginIamScope("RefreshTokenSucceeded", result.UserId);

        _logger.LogInformation(
            "IAM refresh token exchange succeeded for user {ActorUserId}.",
            result.UserId);

        return Ok(result);
    }

    private IDisposable? BeginIamScope(string iamEvent, int? actorUserId)
    {
        return _logger.BeginScope(new Dictionary<string, object?>
        {
            ["Signal"] = LogSignals.IAM,
            ["IamEvent"] = iamEvent,
            ["ActorUserId"] = actorUserId,
            ["TraceId"] = HttpContext.TraceIdentifier,
            ["RequestPath"] = HttpContext.Request.Path.Value,
            ["RemoteIpAddress"] = HttpContext.Connection.RemoteIpAddress?.ToString()
        });
    }

    private static string HashLoginIdentifier(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized.Length == 0)
            return "empty";

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes)[..16];
    }
}
