namespace Identity.Domain.Entities;

public static class EncounterTypes
{
    public const string Outpatient = "outpatient";
    public const string Emergency = "emergency";
    public const string FollowUp = "follow_up";

    public static bool IsValid(string type)
    {
        return type is Outpatient or Emergency or FollowUp;
    }
}