namespace HMS.Contracts.Identity;

public sealed class DoctorProfileDto
{
    public int Id { get; set; }
    public int StaffProfileId { get; set; }
    public int? UserId { get; set; }
    public int PersonId { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }

    public string LicenseNumber { get; set; } = string.Empty;
    public bool IsActive { get; set; }

    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int? SpecializationId { get; set; }
    public string? SpecializationName { get; set; }
}
