using Microsoft.AspNetCore.Authorization;

namespace HMS.Api.Security;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    public const string PermissionClaimType = "permission";

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
        {
            if (context.User.HasClaim(PermissionClaimType, requirement.Permission))
                context.Succeed(requirement);
                
            return Task.CompletedTask;
        }
}