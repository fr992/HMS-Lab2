namespace HMS.Contracts.Identity;

public sealed class DoctorDashboardDto
{
    public string DoctorName { get; set; } = string.Empty;
    public int TodayAppointmentsCount { get; set; }
    public int UpcomingAppointmentsCount { get; set; }
    public int PrimaryPatientsCount { get; set; }
    public int InteractedPatientsCount { get; set; }
    public int OpenEncountersCount { get; set; }
    public int CompletedEncountersCount { get; set; }
    public List<DoctorDashboardRecentPatientDto> RecentPatients { get; set; } = [];
    public List<DoctorDashboardScheduleDto> TodaySchedule { get; set; } = [];
}
