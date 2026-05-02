public class CreatePrescriptionItemDto
{
   public int MedicationId { get; set; }
    public string Dosage { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string? Route { get; set; }
    public string? Instructions { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}