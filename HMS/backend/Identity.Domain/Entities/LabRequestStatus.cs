namespace Identity.Domain.Entities;

public static class LabRequestStatus
{
    public const string Requested = "requested";
    public const string SampleCollected = "sample_collected";
    public const string InProgress = "in_progress";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";

    public static bool IsValid(string status)
    {
        return status is Requested or SampleCollected or InProgress or Completed or Cancelled;
    }
}
