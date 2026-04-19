using Microsoft.AspNetCore.Authorization;

namespace HMS.Api.Security;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permissionName)
    {
        Permission = permissionName;
    }
}