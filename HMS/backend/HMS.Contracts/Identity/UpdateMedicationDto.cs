namespace HMS.Contracts.Identity;

public class UpdateMedicationDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}