namespace HMS.Contracts.Identity;

public class EncounterDto
{
    public int Id { get; set; }
    public string EncounterNumber { get; set; } = string.Empty;

    public int PatientProfileId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    public int DoctorProfileId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }

    public int? AppointmentId { get; set; }

    public string EncounterType { get; set; } = string.Empty;  

    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public int DiagnosesCount { get; set; }
    public int PrescriptionsCount { get; set; }
}
