using HMS.Api.Security;
using Microsoft.AspNetCore.Authorization;

namespace HMS.Api.Authorization;

public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permissionName)
    {
        Policy = PolicyNames.ForPermission(permissionName);
    }
}