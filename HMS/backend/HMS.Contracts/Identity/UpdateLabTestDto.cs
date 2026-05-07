namespace HMS.Contracts.Identity;

public class UpdateLabTestDto
{
    public string? TestCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SpecimenType { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public bool IsActive { get; set; }
}
