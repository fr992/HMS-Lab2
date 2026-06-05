using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardQueryService _dashboard;

    public DashboardController(IDashboardQueryService dashboard)
    {
        _dashboard = dashboard;
    }

    [HttpGet("stats/patients")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<DashboardTotalStatsDto>> PatientStats(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetPatientStatsAsync(cancellationToken));
    }

    [HttpGet("stats/appointments/today")]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<DashboardCountStatsDto>> TodayAppointmentStats(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetTodayAppointmentStatsAsync(cancellationToken));
    }

    [HttpGet("stats/doctors/active")]
    [RequirePermission("Users.Read")]
    public async Task<ActionResult<ActiveDoctorStatsDto>> ActiveDoctorStats(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetActiveDoctorStatsAsync(cancellationToken));
    }

    [HttpGet("stats/lab/pending")]
    [RequirePermission("LabRequests.Read")]
    public async Task<ActionResult<DashboardCountStatsDto>> PendingLabStats(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetPendingLabStatsAsync(cancellationToken));
    }

    [HttpGet("stats/revenue/mtd")]
    [RequirePermission("Payments.Read")]
    public async Task<ActionResult<RevenueMtdStatsDto>> RevenueMtdStats(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetRevenueMtdStatsAsync(cancellationToken));
    }

    [HttpGet("stats/nurse-tasks/open")]
    [RequirePermission("NurseTasks.Read")]
    public async Task<ActionResult<DashboardCountStatsDto>> OpenNurseTaskStats(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetOpenNurseTaskStatsAsync(cancellationToken));
    }

    [HttpGet("charts/patient-trends")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<PatientTrendDto>>> PatientTrends(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetPatientTrendsAsync(cancellationToken));
    }

    [HttpGet("charts/revenue")]
    [RequirePermission("Payments.Read")]
    public async Task<ActionResult<IReadOnlyList<RevenueChartDto>>> RevenueChart(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetRevenueChartAsync(cancellationToken));
    }

    [HttpGet("charts/departments")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<DepartmentChartDto>>> DepartmentChart(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetDepartmentChartAsync(cancellationToken));
    }

    [HttpGet("beds/occupancy")]
    [RequirePermission("Beds.Read")]
    public async Task<ActionResult<BedOccupancyDto>> BedOccupancy(CancellationToken cancellationToken)
    {
        return Ok(await _dashboard.GetBedOccupancyAsync(cancellationToken));
    }

    [HttpGet("patients/recent")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<RecentPatientDashboardDto>>> RecentPatients(
        [FromQuery] int limit = 5,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _dashboard.GetRecentPatientsAsync(limit, cancellationToken));
    }

    [HttpGet("appointments/upcoming")]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<IReadOnlyList<UpcomingAppointmentDashboardDto>>> UpcomingAppointments(
        [FromQuery] int limit = 4,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _dashboard.GetUpcomingAppointmentsAsync(limit, cancellationToken));
    }

    [HttpGet("alerts")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<DashboardAlertDto>>> Alerts(
        [FromQuery] int limit = 4,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _dashboard.GetAlertsAsync(limit, cancellationToken));
    }
}
