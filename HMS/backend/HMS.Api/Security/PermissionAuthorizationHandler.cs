using HMS.Api.Logging;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace HMS.Api.Security;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    public const string PermissionClaimType = "permission";
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<PermissionAuthorizationHandler> _logger;

    public PermissionAuthorizationHandler(
        IHttpContextAccessor httpContextAccessor,
        ILogger<PermissionAuthorizationHandler> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
        {
            var actorUserId = CurrentUserId(context.User);

            if (context.User.IsInRole("SuperAdmin"))
            {
                context.Succeed(requirement);
                LogPermissionDecision(requirement.Permission, actorUserId, granted: true, reason: "SuperAdmin");
                return Task.CompletedTask;
            }

            if (context.User.HasClaim(PermissionClaimType, requirement.Permission))
            {
                context.Succeed(requirement);
                LogPermissionDecision(requirement.Permission, actorUserId, granted: true, reason: "PermissionClaim");
                return Task.CompletedTask;
            }

            LogPermissionDecision(requirement.Permission, actorUserId, granted: false, reason: "MissingPermission");
                
            return Task.CompletedTask;
        }

    private void LogPermissionDecision(string permission, string? actorUserId, bool granted, string reason)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        using var scope = _logger.BeginScope(new Dictionary<string, object?>
        {
            ["Signal"] = LogSignals.IAM,
            ["IamEvent"] = granted ? "PermissionGranted" : "PermissionDenied",
            ["ActorUserId"] = actorUserId,
            ["TraceId"] = httpContext?.TraceIdentifier,
            ["RequestPath"] = httpContext?.Request.Path.Value,
            ["RemoteIpAddress"] = httpContext?.Connection.RemoteIpAddress?.ToString()
        });

        if (granted)
        {
            _logger.LogInformation(
                "IAM permission {Permission} granted for user {ActorUserId}. Reason: {AuthorizationReason}.",
                permission,
                actorUserId ?? "anonymous",
                reason);

            return;
        }

        _logger.LogWarning(
            "IAM permission {Permission} denied for user {ActorUserId}. Reason: {AuthorizationReason}.",
            permission,
            actorUserId ?? "anonymous",
            reason);
    }

    private static string? CurrentUserId(ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");
    }
}
