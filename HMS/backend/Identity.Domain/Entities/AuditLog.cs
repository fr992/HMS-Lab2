using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class AuditLog : BaseEntity
{
    public int? UserId { get; set; }
    public User? User { get; set; }

    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public int? EntityId { get; set; }

    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IpAddress { get; set; }
}