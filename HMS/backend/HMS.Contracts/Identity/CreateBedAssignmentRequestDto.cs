namespace HMS.Contracts.Identity;

public sealed class CreateBedAssignmentRequestDto
{
    public string Priority { get; set; } = "routine";
    public string? Notes { get; set; }
    public string? PreferredWard { get; set; }
}
