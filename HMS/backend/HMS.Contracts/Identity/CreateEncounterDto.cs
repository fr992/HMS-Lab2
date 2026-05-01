namespace HMS.Contracts.Identity;

public class CreateEncounterDto
{
    public int PatientProfileId { get; set; }
    public int DoctorProfileId { get; set; }
    public int? AppointmentId { get; set; }

    public string EncounterType { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }

    public string? Notes { get; set; }
}