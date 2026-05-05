namespace HMS.Contracts.Identity;

public class LabRequestDto
{
    public int Id { get; set; }
    public string RequestNumber { get; set; } = string.Empty;

    public int EncounterId { get; set; }
    public int PatientProfileId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    public int RequestedByDoctorId { get; set; }
    public string RequestedByDoctorName { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ClinicalNotes { get; set; }

    public DateTime RequestedAt { get; set; }
    public DateTime? CollectedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<LabRequestItemDto> Items { get; set; } = new();
}
