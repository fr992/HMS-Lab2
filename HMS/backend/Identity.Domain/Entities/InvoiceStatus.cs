namespace HMS.Domain.Entities;

public static class InvoiceStatus
{
    public const string Draft = "draft";
    public const string Issued = "issued";
    public const string Paid = "paid";
    public const string PartiallyPaid = "partially_paid";
    public const string Cancelled = "cancelled";
}
