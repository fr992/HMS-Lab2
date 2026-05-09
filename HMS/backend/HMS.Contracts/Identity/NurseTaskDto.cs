namespace HMS.Contracts.Identity;

public sealed class NurseTaskDto
{
    public int Id { get; set; }
    public int EncounterId { get; set; }
    public string? EncounterNumber { get; set; }
    public string? PatientName { get; set; }
    public int AssignedByDoctorId { get; set; }
    public string? AssignedByDoctorName { get; set; }
    public int? AssignedToNurseId { get; set; }
    public string? AssignedToNurseName { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? CompletedByUserId { get; set; }
    public DateTime UpdatedAt { get; set; }
}
