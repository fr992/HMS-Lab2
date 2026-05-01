namespace Identity.Domain.Entities;

public static class EncounterStatus
{
    public const string Open = "open";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";

    public static bool IsValid(string status)
    {
        return status is Open or Completed or Cancelled;
    }
}