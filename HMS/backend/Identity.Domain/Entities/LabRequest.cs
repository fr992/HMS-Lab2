using HMS.Domain.Entities;
using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class LabRequest : BaseEntity
{
    public string RequestNumber { get; set; } = string.Empty;

    public int EncounterId { get; set; }
    public Encounter Encounter { get; set; } = null!;

    public int RequestedByDoctorId { get; set; }
    public DoctorProfile RequestedByDoctor { get; set; } = null!;

    public string Priority { get; set; } = LabRequestPriority.Routine;
    public string Status { get; set; } = LabRequestStatus.Requested;
    public string? ClinicalNotes { get; set; }

    public DateTime RequestedAt { get; set; }
    public DateTime? CollectedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<LabRequestItem> Items { get; set; } = new List<LabRequestItem>();
}
