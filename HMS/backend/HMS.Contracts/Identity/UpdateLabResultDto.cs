namespace HMS.Contracts.Identity;

public class UpdateLabResultDto
{
    public string ResultData { get; set; } = string.Empty;
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
}
