namespace HMS.Contracts.Identity;

public sealed class DoctorDashboardScheduleDto
{
    public int AppointmentId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? AppointmentType { get; set; }
    public DateTime ScheduledStart { get; set; }
    public DateTime ScheduledEnd { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
}
