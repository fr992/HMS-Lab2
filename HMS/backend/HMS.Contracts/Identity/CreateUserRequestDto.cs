namespace HMS.Contracts.Identity;

public sealed class CreateUserRequestDto
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public List<string> RoleNames { get; set; } = new();
}
