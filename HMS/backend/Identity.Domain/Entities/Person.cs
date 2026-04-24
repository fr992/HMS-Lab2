using HMS.Shared.Entities;
using Identity.Domain.Entities;

namespace HMS.Domain.Entities;

public class Person : BaseEntity
{
    public int UserId { get; set; }
    public User? User { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PersonalNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public PatientProfile? PatientProfile { get; set; }
    public StaffProfile? StaffProfile { get; set; }

    public string FullName => $"{FirstName} {LastName}";
}
