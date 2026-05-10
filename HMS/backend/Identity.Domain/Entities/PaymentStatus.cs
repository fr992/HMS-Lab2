namespace HMS.Domain.Entities;

public static class PaymentStatus
{
    public const string Pending = "pending";
    public const string Paid = "paid";
    public const string Failed = "failed";
    public const string Cancelled = "cancelled";
    public const string Refunded = "refunded";

    private static readonly string[] CanonicalStatusesOrdered =
    [
        Pending,
        Paid,
        Failed,
        Cancelled,
        Refunded,
    ];

    public static bool IsKnownStatus(string status)
    {
        return TryResolveCanonical(status, out _);
    }

    public static string NormalizeToKnownStatus(string raw)
    {
        if (!TryResolveCanonical(raw, out var canonical))
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(raw)
                    ? "Payment status is required."
                    : $"Unknown payment status: '{raw.Trim()}'.");

        return canonical;
    }

    private static bool TryResolveCanonical(string? raw, out string canonical)
    {
        canonical = string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var trimmed = raw.Trim();
        foreach (var status in CanonicalStatusesOrdered)
        {
            if (string.Equals(trimmed, status, StringComparison.OrdinalIgnoreCase))
            {
                canonical = status;
                return true;
            }
        }

        return false;
    }
}
