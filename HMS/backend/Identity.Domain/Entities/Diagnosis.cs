using HMS.Domain.Entities;
using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class Diagnosis : BaseEntity
{
    public int EncounterId { get; set; }
    public Encounter Encounter { get; set; } = null!;

    public int CreatedByDoctorId { get; set; }
    public DoctorProfile CreatedByDoctor { get; set; } = null!;

    public string? IcdCode { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Notes { get; set; }
    public DateTime DiagnosedAt { get; set; }
}
