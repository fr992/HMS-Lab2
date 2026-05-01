namespace HMS.Contracts.Identity;

public class UpdateEncounterDto
{
    public string EncounterType { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? Notes { get; set; }
}