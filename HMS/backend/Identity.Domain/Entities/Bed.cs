using HMS.Shared.Entities;

namespace HMS.Domain.Entities;

public sealed class Bed : BaseEntity
{
    public string Ward { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public string BedNumber { get; set; } = string.Empty;
    public string? Floor { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    public ICollection<BedAssignment> Assignments { get; set; } = new List<BedAssignment>();
}
