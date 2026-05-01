namespace Identity.Domain.Entities;

public static class PrescriptionStatus
{
    public const string Active = "active";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";

    public static bool IsValid(string status)
    {
        return status is Active or Completed or Cancelled;
    }
}