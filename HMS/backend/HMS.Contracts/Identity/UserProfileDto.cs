namespace HMS.Contracts.Identity;

public class UserProfileDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public string? PersonalNumber { get; set; }
    public string? Gender { get; set; }
    public string? PhoneNumber { get; set; }
    public string? FullAddress { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? PatientId { get; set; }
    public string? InsuranceNumber { get; set; }
    public string? BloodType { get; set; }
    public string? PrimaryDoctor { get; set; }
    public string? StaffNumber { get; set; }
    public string? LicenseNumber { get; set; }
    public string? EmploymentStatus { get; set; }
    public string? Department { get; set; }
    public string? Specialization { get; set; }
    public IReadOnlyList<PatientContactDto> Contacts { get; set; } = [];
}
