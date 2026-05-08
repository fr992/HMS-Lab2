namespace HMS.Contracts.Identity;

public sealed class UpdateNurseTaskRequestDto
{
    public int? AssignedToNurseId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string? Notes { get; set; }
    public DateTime? DueAt { get; set; }
}
