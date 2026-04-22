using HMS.Shared.Entities;

namespace HMS.Domain.Entities;

public class DoctorProfile : BaseEntity
{
    public int StaffProfileId { get; set; }
    public StaffProfile StaffProfile { get; set; } = null!;

    public int? SpecializationId { get; set; }
    public Specialization? Specialization { get; set; }

    public string LicenseNumber { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<PatientProfile> AssignedPatients { get; set; } = new List<PatientProfile>();
}