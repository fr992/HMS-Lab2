using Identity.Domain.Entities;

namespace HMS.Domain.Entities;

public sealed class BedAssignment
{
    public int Id { get; set; }

    public int BedId { get; set; }
    public Bed Bed { get; set; } = null!;

    public int PatientProfileId { get; set; }
    public PatientProfile PatientProfile { get; set; } = null!;

    public int? EncounterId { get; set; }
    public Encounter? Encounter { get; set; }

    public DateTime AssignedAt { get; set; }
    public int AssignedByUserId { get; set; }
    public User AssignedByUser { get; set; } = null!;

    public DateTime? ReleasedAt { get; set; }
    public int? ReleasedByUserId { get; set; }
    public User? ReleasedByUser { get; set; }

    public string? Notes { get; set; }
    public string? ReleaseNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
