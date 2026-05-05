namespace Identity.Domain.Entities;

public static class LabRequestPriority
{
    public const string Routine = "routine";
    public const string Urgent = "urgent";
    public const string Stat = "stat";

    public static bool IsValid(string priority)
    {
        return priority is Routine or Urgent or Stat;
    }
}
