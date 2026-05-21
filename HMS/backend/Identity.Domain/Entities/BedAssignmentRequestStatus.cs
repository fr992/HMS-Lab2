namespace HMS.Domain.Entities;

public static class BedAssignmentRequestStatus
{
    public const string Pending = "Pending";
    public const string Assigned = "Assigned";
    public const string Rejected = "Rejected";
    public const string Cancelled = "Cancelled";

    public static bool IsResolved(string? status)
    {
        return string.Equals(status, Assigned, StringComparison.OrdinalIgnoreCase)
            || string.Equals(status, Rejected, StringComparison.OrdinalIgnoreCase)
            || string.Equals(status, Cancelled, StringComparison.OrdinalIgnoreCase);
    }
}
