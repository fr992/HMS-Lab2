using HMS.Domain.Entities;
using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class Prescription : BaseEntity
{
    public int EncounterId { get; set; }
    public Encounter Encounter { get; set; } = null!;

    public int PrescribedByDoctorId { get; set; }
    public DoctorProfile PrescribedByDoctor { get; set; } = null!;

    public string? Notes { get; set; }

    public string Status { get; set; } = PrescriptionStatus.Active;

    public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
}