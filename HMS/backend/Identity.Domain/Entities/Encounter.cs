using HMS.Shared.Entities;
using HMS.Domain.Entities;

namespace Identity.Domain.Entities;

public class Encounter : BaseEntity
{
    public string EncounterNumber { get; set; } = string.Empty;

    public int PatientProfileId { get; set; }
    public PatientProfile PatientProfile { get; set; } = null!;

    public int DoctorProfileId { get; set; }
    public DoctorProfile DoctorProfile { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public string EncounterType { get; set; } = EncounterTypes.Outpatient;

    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public string Status { get; set; } = EncounterStatus.Open;

    public string? Notes { get; set; }

    public int? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public int? UpdatedByUserId { get; set; }
    public User? UpdatedByUser { get; set; }

    public ICollection<Diagnosis> Diagnoses { get; set; } = new List<Diagnosis>();
    public ICollection<LabRequest> LabRequests { get; set; } = new List<LabRequest>();
}
