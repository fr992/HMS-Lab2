using HMS.Shared.Entities;

namespace HMS.Domain.Entities;

public class PatientProfile : BaseEntity
{
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string PatientNumber { get; set; } = string.Empty;
    public string? InsuranceNumber { get; set; }
    public string? BloodType { get; set; }

    public int? PrimaryDoctorId { get; set; }
    public DoctorProfile? PrimaryDoctor { get; set; }
}