namespace HMS.Contracts.Identity;

public sealed class RoleUpsertDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> PermissionNames { get; set; } = [];
}

public sealed class SetRolePermissionsDto
{
    public List<string> PermissionNames { get; set; } = [];
}

public sealed class RoleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> PermissionNames { get; set; } = [];
}

public sealed class RolePermissionsDto
{
    public int RoleId { get; set; }
    public List<string> PermissionNames { get; set; } = [];
}

public sealed class PermissionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
