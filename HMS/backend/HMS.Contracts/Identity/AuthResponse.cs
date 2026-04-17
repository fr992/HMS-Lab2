namespace HMS.Contracts.Identity;

public sealed class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresInSeconds { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
}