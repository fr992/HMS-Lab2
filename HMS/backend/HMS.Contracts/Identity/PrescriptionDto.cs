public class PrescriptionDto
{
    public int Id { get; set; }
    public int EncounterId { get; set; }
    public int PrescribedByDoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<PrescriptionItemDto> Items { get; set; } = new();
}