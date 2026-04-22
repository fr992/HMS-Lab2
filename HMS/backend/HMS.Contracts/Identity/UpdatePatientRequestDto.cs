namespace HMS.Contracts.Identity;

public sealed class UpdatePatientRequestDto
{
    // Person fields (all optional — only update what's provided)
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PersonalNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    // PatientProfile fields
    public string? InsuranceNumber { get; set; }
    public string? BloodType { get; set; }
    public int? PrimaryDoctorId { get; set; }
}