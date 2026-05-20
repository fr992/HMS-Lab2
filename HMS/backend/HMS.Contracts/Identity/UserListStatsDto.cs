namespace HMS.Contracts.Identity;

public sealed class UserListStatsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int InactiveUsers { get; set; }
    public int SuperAdmins { get; set; }
}
