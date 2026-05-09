namespace HMS.Contracts.Identity;

public sealed class AssignBedDto
{
    public int PatientProfileId { get; set; }
    public int? EncounterId { get; set; }
    public string? Notes { get; set; }
}
