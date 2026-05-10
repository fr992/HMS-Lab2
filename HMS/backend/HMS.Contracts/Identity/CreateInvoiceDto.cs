namespace HMS.Contracts.Identity
{
    public sealed class CreateInvoiceDto
    {
        public int PatientProfileId { get; set; }
        public int? EncounterId { get; set; }
        public string Currency { get; set; } = "EUR";
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public DateTime? DueAt { get; set; }
        public IReadOnlyList<CreateInvoiceItemDto> Items { get; set; } = [];
    }
}
