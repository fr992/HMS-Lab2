namespace HMS.Contracts.Identity
{
    public sealed class CreateStripeCheckoutDto
    {
        public int PaymentId { get; set; }
        public int InvoiceId { get; set; }
    }
}
