namespace HMS.Contracts.Identity;

public sealed class InvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int PatientProfileId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientNumber { get; set; }
    public int? EncounterId { get; set; }
    public string? EncounterNumber { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateTime? DueAt { get; set; }
    public IReadOnlyList<InvoiceItemDto> Items { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
