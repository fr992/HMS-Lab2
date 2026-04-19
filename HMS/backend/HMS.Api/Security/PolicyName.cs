namespace HMS.Api.Security;

public static class PolicyNames
{
    public static string ForPermission(string permissionName) => $"perm:{permissionName}";
}