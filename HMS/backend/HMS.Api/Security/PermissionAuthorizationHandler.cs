using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace HMS.Api.Security;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    public const string PermissionClaimType = "permission";

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
        {
            if (context.User.IsInRole("SuperAdmin"))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }

            if (context.User.HasClaim(PermissionClaimType, requirement.Permission))
                context.Succeed(requirement);
                
            return Task.CompletedTask;
        }
}
