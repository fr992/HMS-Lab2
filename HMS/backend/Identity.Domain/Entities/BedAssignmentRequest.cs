using HMS.Shared.Entities;
using Identity.Domain.Entities;

namespace HMS.Domain.Entities;

public sealed class BedAssignmentRequest : BaseEntity
{
    public int EncounterId { get; set; }
    public Encounter Encounter { get; set; } = null!;

    public int PatientProfileId { get; set; }
    public PatientProfile PatientProfile { get; set; } = null!;

    public int RequestedByDoctorId { get; set; }
    public DoctorProfile RequestedByDoctor { get; set; } = null!;

    public string Status { get; set; } = BedAssignmentRequestStatus.Pending;
    public string Priority { get; set; } = "routine";
    public string? Notes { get; set; }
    public string? PreferredWard { get; set; }

    public DateTime RequestedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public int? ResolvedByUserId { get; set; }
    public User? ResolvedByUser { get; set; }

    public int? BedAssignmentId { get; set; }
    public BedAssignment? BedAssignment { get; set; }
}
