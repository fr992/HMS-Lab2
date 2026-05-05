namespace HMS.Contracts.Identity;

public class LabRequestItemDto
{
    public int Id { get; set; }
    public int LabRequestId { get; set; }
    public string? TestCode { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string? SpecimenType { get; set; }
    public string? Notes { get; set; }
    public List<LabResultDto> Results { get; set; } = new();
}
