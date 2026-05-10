namespace HMS.Contracts.Identity
{
    public sealed class CreateInvoiceItemDto
    {
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? SourceType { get; set; }
        public int? SourceId { get; set; }
    }
}
