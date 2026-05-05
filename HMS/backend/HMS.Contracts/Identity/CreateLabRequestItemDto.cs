namespace HMS.Contracts.Identity;

public class CreateLabRequestItemDto
{
    public string? TestCode { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string? SpecimenType { get; set; }
    public string? Notes { get; set; }
}
