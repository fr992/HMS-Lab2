namespace Identity.Domain.Entities;

public static class LabResultStatus
{
    public const string Draft = "draft";
    public const string Published = "published";

    public static bool IsValid(string? value)
    {
        return value is Draft or Published;
    }
}
