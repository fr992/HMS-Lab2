namespace HMS.Contracts.Identity;

public class CreateDiagnosisDto
{
    public string? IcdCode { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Notes { get; set; }
    public DateTime? DiagnosedAt { get; set; }
}
