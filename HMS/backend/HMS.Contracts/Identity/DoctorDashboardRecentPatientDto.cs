namespace HMS.Contracts.Identity;

public sealed class DoctorDashboardRecentPatientDto
{
    public int PatientProfileId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public int? Age { get; set; }
    public string? Status { get; set; }
    public DateTime? LastActivityAt { get; set; }
}
