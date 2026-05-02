using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class PrescriptionItem : BaseEntity
{
    public int PrescriptionId { get; set; }
    public Prescription Prescription { get; set; } = null!;

    public int MedicationId { get; set; }
    public Medication Medication { get; set; } = null!;

    public string Dosage { get; set; } = string.Empty;
    public string? Unit { get; set; }

    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;

    public string? Route { get; set; }
    public string? Instructions { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}