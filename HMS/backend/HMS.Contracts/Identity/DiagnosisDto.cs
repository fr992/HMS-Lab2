namespace HMS.Contracts.Identity;

public class DiagnosisDto
{
    public int Id { get; set; }
    public int EncounterId { get; set; }
    public int CreatedByDoctorId { get; set; }
    public string CreatedByDoctorName { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Notes { get; set; }
    public DateTime DiagnosedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
