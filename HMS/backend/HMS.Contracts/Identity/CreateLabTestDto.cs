namespace HMS.Contracts.Identity;

public class CreateLabTestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public bool IsActive { get; set; } = true;
}
