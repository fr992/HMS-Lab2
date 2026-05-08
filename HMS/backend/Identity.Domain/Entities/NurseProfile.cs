using HMS.Shared.Entities;

namespace HMS.Domain.Entities;

public class NurseProfile : BaseEntity
{
    public int StaffProfileId { get; set; }
    public StaffProfile StaffProfile { get; set; } = null!;

    public string LicenseNumber { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
