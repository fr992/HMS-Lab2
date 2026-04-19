namespace HMS.Contracts.Identity;

public sealed class UserDetailResponse
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? PhoneNumber { get; set; }
    public IReadOnlyList<string> RoleNames { get; set; } = Array.Empty<string>();
}