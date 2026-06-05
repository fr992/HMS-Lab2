using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IDashboardQueryService
{
    Task<DashboardTotalStatsDto> GetPatientStatsAsync(CancellationToken cancellationToken);

    Task<DashboardCountStatsDto> GetTodayAppointmentStatsAsync(CancellationToken cancellationToken);

    Task<ActiveDoctorStatsDto> GetActiveDoctorStatsAsync(CancellationToken cancellationToken);

    Task<DashboardCountStatsDto> GetPendingLabStatsAsync(CancellationToken cancellationToken);

    Task<RevenueMtdStatsDto> GetRevenueMtdStatsAsync(CancellationToken cancellationToken);

    Task<DashboardCountStatsDto> GetOpenNurseTaskStatsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<PatientTrendDto>> GetPatientTrendsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<RevenueChartDto>> GetRevenueChartAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<DepartmentChartDto>> GetDepartmentChartAsync(CancellationToken cancellationToken);

    Task<BedOccupancyDto> GetBedOccupancyAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<RecentPatientDashboardDto>> GetRecentPatientsAsync(
        int limit,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<UpcomingAppointmentDashboardDto>> GetUpcomingAppointmentsAsync(
        int limit,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<DashboardAlertDto>> GetAlertsAsync(
        int limit,
        CancellationToken cancellationToken);
}
