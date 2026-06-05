namespace HMS.Contracts.Identity;

public sealed class BedAssignmentRequestDto
{
    public int Id { get; set; }
    public int EncounterId { get; set; }
    public string? EncounterNumber { get; set; }
    public int PatientProfileId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientNumber { get; set; }
    public int RequestedByDoctorId { get; set; }
    public string? RequestedByDoctorName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? PreferredWard { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int? ResolvedByUserId { get; set; }
    public int? BedAssignmentId { get; set; }
    public string? AssignedBedLabel { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
