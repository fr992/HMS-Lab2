namespace HMS.Domain.Entities;

public static class NurseTaskStatus
{
    public const string Pending = "pending";
    public const string InProgress = "in_progress";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";

    private static readonly string[] CanonicalStatusesOrdered =
    [
        Pending,
        InProgress,
        Completed,
        Cancelled,
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
                    ? "Nurse task status is required."
                    : $"Unknown nurse task status: '{raw.Trim()}'.");

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
