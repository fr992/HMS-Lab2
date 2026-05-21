namespace HMS.Contracts.Identity;

public sealed class BedAssignmentDto
{
    public int Id { get; set; }
    public int BedId { get; set; }
    public string? BedLabel { get; set; }
    public int PatientProfileId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientNumber { get; set; }
    public int? EncounterId { get; set; }
    public string? EncounterNumber { get; set; }
    public DateTime AssignedAt { get; set; }
    public int AssignedByUserId { get; set; }
    public string? AssignedByUserName { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public int? ReleasedByUserId { get; set; }
    public string? ReleasedByUserName { get; set; }
    public string? Notes { get; set; }
    public string? ReleaseNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
