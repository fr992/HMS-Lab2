using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class UserRole : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; }
}