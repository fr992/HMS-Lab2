using HMS.Shared.Entities;

namespace HMS.Domain.Entities;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<StaffProfile> StaffProfiles { get; set; } = new List<StaffProfile>();
}