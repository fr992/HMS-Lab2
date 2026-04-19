namespace HMS.Contracts.Identity;

public sealed class LoginRequestDto
{
    public string UserNameOrEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
