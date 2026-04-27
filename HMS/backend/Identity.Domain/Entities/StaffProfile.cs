using HMS.Shared.Entities;

namespace HMS.Domain.Entities;

public class StaffProfile : BaseEntity
{
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string StaffNumber { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public string EmploymentStatus { get; set; } = string.Empty;
    public DateTime? HireDate { get; set; }

    public DoctorProfile? DoctorProfile { get; set; }
    public NurseProfile? NurseProfile { get; set; }
}