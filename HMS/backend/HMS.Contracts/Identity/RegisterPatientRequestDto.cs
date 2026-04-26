namespace HMS.Contracts.Identity;

public sealed class RegisterPatientRequestDto
{
    /// <summary>When true or omitted, create a user and link. When false, register patient record only (no portal login).</summary>
    public bool? CreatePortalAccount { get; set; }

    // ── User (auth) fields — used only when CreatePortalAccount is true (default) ──
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }

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