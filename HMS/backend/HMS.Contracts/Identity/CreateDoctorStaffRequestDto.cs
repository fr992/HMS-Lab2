namespace HMS.Contracts.Identity;

public sealed class CreateDoctorStaffRequestDto
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PersonalNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public string StaffNumber { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
    public string EmploymentStatus { get; set; } = "Active";
    public DateTime? HireDate { get; set; }

    public int? SpecializationId { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
}
