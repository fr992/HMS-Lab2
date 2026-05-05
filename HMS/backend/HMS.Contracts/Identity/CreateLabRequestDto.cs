namespace HMS.Contracts.Identity;

public class CreateLabRequestDto
{
    public string? Priority { get; set; }
    public string? ClinicalNotes { get; set; }
    public List<CreateLabRequestItemDto> Items { get; set; } = new();
}
