namespace Identity.Domain.Entities { 
public static class AppointmentStatus
{
    public const string Scheduled = "scheduled";
    public const string Confirmed = "confirmed";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
    public const string NoShow = "no_show";
}
}