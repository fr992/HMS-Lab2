namespace HMS.Contracts.Identity;

public sealed class UserDetailResponseDto
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public IReadOnlyList<string> RoleNames { get; set; } = Array.Empty<string>();
}