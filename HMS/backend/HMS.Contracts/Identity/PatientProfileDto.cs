namespace HMS.Contracts.Identity;

public sealed class PatientProfileDto
{
    // PatientProfile
    public int Id { get; set; }
    public string PatientNumber { get; set; } = string.Empty;
    public string? InsuranceNumber { get; set; }
    public string? BloodType { get; set; }
    public int? PrimaryDoctorId { get; set; }

    // Person
    public int PersonId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PersonalNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    // User (null when the person has no linked login account)
    public int? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}