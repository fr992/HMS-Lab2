using HMS.Shared.Entities;
namespace HMS.Domain.Entities;

public class PatientContact : BaseEntity
{
    public int PatientProfileId { get; set; }
    public PatientProfile PatientProfile { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }

    public bool IsPrimary { get; set; }
}