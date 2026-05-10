using HMS.Shared.Entities;
using Identity.Domain.Entities;

namespace HMS.Domain.Entities;

public sealed class Invoice : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;

    public int PatientProfileId { get; set; }
    public PatientProfile PatientProfile { get; set; } = null!;

    public int? EncounterId { get; set; }
    public Encounter? Encounter { get; set; }

    public string Currency { get; set; } = "EUR";

    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = InvoiceStatus.Draft;

    public DateTime IssuedAt { get; set; }
    public DateTime? DueAt { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}
