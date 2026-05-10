namespace HMS.Contracts.Identity;

public sealed class PaymentDto
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public string? TransactionReference { get; set; }
    public int? ReceivedByUserId { get; set; }
    public string? ReceivedByUserName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
