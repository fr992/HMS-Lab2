using Identity.Domain.Entities;

namespace HMS.Domain.Entities;

public sealed class NurseTask
{
    public int Id { get; set; }

    public int EncounterId { get; set; }
    public Encounter Encounter { get; set; } = null!;

    public int AssignedByDoctorId { get; set; }
    public DoctorProfile AssignedByDoctor { get; set; } = null!;

    public int? AssignedToNurseId { get; set; }
    public NurseProfile? AssignedToNurse { get; set; }

    public string Type { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string Status { get; set; } = NurseTaskStatus.Pending;
    public string? Notes { get; set; }
    public DateTime? DueAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? CompletedByUserId { get; set; }
    public User? CompletedByUser { get; set; }
    public DateTime UpdatedAt { get; set; }
}
