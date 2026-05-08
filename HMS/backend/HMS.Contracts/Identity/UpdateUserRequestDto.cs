namespace HMS.Contracts.Identity;

public sealed class UpdateUserRequestDto
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? NewPassword { get; set; }
    public bool? IsActive { get; set; }
    public List<string>? RoleNames { get; set; }
}
