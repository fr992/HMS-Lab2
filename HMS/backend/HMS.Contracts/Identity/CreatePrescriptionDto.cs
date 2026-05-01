public class CreatePrescriptionDto
{
    public int EncounterId { get; set; }
    public int PrescribedByDoctorId { get; set; }
    public string? Notes { get; set; }
    public List<CreatePrescriptionItemDto> Items { get; set; } = new();
}