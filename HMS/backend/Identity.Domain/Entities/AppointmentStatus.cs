namespace Identity.Domain.Entities;

/// <summary>
/// Canonical status values and valid transitions for appointments.
/// </summary>
public static class AppointmentStatus
{
    public const string Scheduled = "scheduled";
    public const string Confirmed = "confirmed";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
    public const string NoShow = "no_show";

    private static readonly Dictionary<string, HashSet<string>> AllowedTransitions = new(
        StringComparer.Ordinal)
    {
        [Scheduled] =
        [
            Confirmed,
            Cancelled,
            NoShow,
        ],
        [Confirmed] =
        [
            Completed,
            Cancelled,
            NoShow,
        ],
        [NoShow] =
        [
            Cancelled,
        ],
    };

    private static readonly string[] CanonicalStatusesOrdered =
    [
        Scheduled,
        Confirmed,
        Completed,
        Cancelled,
        NoShow,
    ];

    public static bool IsKnownStatus(string status)
    {
        return TryResolveCanonical(status, out _);
    }

    /// <summary>
    /// Returns the canonical lowercase status string or throws if unknown.
    /// </summary>
    public static string NormalizeToKnownStatus(string raw)
    {
        if (!TryResolveCanonical(raw, out var canonical))
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(raw)
                    ? "Appointment status is required."
                    : $"Unknown appointment status: '{raw.Trim()}'.");

        return canonical;
    }

    public static bool CanTransition(string currentStatus, string newStatus)
    {
        if (!TryResolveCanonical(currentStatus, out var current))
            return false;
        if (!TryResolveCanonical(newStatus, out var next))
            return false;

        if (string.Equals(current, next, StringComparison.Ordinal))
            return false;

        return AllowedTransitions.TryGetValue(current, out var allowed) && allowed.Contains(next);
    }

    public static void EnsureCanTransition(string currentStatus, string newStatus)
    {
        var current = NormalizeToKnownStatus(currentStatus);
        var next = NormalizeToKnownStatus(newStatus);

        if (string.Equals(current, next, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"The appointment is already {FormatStatusForMessage(next)}.");
        }

        if (AllowedTransitions.TryGetValue(current, out var allowed) && allowed.Contains(next))
            return;

        throw new InvalidOperationException(
            $"Cannot change appointment status from {FormatStatusForMessage(current)} to {FormatStatusForMessage(next)}.");
    }

    private static bool TryResolveCanonical(string? raw, out string canonical)
    {
        canonical = string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var trimmed = raw.Trim();
        foreach (var s in CanonicalStatusesOrdered)
        {
            if (string.Equals(trimmed, s, StringComparison.OrdinalIgnoreCase))
            {
                canonical = s;
                return true;
            }
        }

        return false;
    }

    private static string FormatStatusForMessage(string canonical) =>
        canonical switch
        {
            Scheduled => "Scheduled",
            Confirmed => "Confirmed",
            Completed => "Completed",
            Cancelled => "Cancelled",
            NoShow => "No show",
            _ => canonical,
        };
}
