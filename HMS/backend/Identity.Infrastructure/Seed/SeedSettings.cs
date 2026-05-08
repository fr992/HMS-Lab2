namespace Identity.Infrastructure.Seed;

public sealed class SeedSettings
{
    public const string SectionName = "Seed";

    public bool EnsureRoles { get; set; } = true;

    public bool EnsureBootstrapAdmin { get; set; } = true;

    public string AdminUserName { get; set; } = "admin";
    public string AdminEmail { get; set; } = "admin@hms.local";
    public string AdminPassword { get; set; } = string.Empty;
    public string AdminFirstName { get; set; } = "System";
    public string AdminLastName { get; set; } = "Administrator";
}
