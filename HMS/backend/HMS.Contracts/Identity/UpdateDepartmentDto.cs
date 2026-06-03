namespace HMS.Contracts.Identity;

public sealed class UpdateDepartmentDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
