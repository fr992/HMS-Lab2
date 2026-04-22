namespace HMS.Contracts.Identity;

public sealed class RegisterPatientRequestDto
{
    // ── User (auth) fields ─────────────────────────────────
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    // ── Person (identity) fields ───────────────────────────
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PersonalNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    // ── PatientProfile fields ──────────────────────────────
    public string? InsuranceNumber { get; set; }
    public string? BloodType { get; set; }
    public int? PrimaryDoctorId { get; set; }
}