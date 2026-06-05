using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class DashboardQueryService : IDashboardQueryService
{
    private readonly IHmsRepository _db;

    public DashboardQueryService(IHmsRepository db)
    {
        _db = db;
    }

    public async Task<DashboardTotalStatsDto> GetPatientStatsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-30);
        var previousStart = now.AddDays(-60);
        var total = await _db.Query<PatientProfile>().CountAsync(cancellationToken);
        var current = await _db.Query<PatientProfile>().CountAsync(patient => patient.CreatedAt >= start, cancellationToken);
        var previous = await _db.Query<PatientProfile>().CountAsync(
            patient => patient.CreatedAt >= previousStart && patient.CreatedAt < start,
            cancellationToken);

        return new DashboardTotalStatsDto
        {
            Total = total,
            Change = FormatChange(current, previous),
            Trend = Trend(current, previous)
        };
    }

    public async Task<DashboardCountStatsDto> GetTodayAppointmentStatsAsync(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var yesterday = today.AddDays(-1);
        var count = await _db.Query<Appointment>()
            .CountAsync(appointment => appointment.ScheduledStart >= today && appointment.ScheduledStart < tomorrow, cancellationToken);
        var previous = await _db.Query<Appointment>()
            .CountAsync(appointment => appointment.ScheduledStart >= yesterday && appointment.ScheduledStart < today, cancellationToken);

        return new DashboardCountStatsDto
        {
            Count = count,
            Change = FormatChange(count, previous),
            Trend = Trend(count, previous)
        };
    }

    public async Task<ActiveDoctorStatsDto> GetActiveDoctorStatsAsync(CancellationToken cancellationToken)
    {
        return new ActiveDoctorStatsDto
        {
            Count = await _db.Query<DoctorProfile>().CountAsync(doctor => doctor.IsActive, cancellationToken),
            Label = "On duty"
        };
    }

    public async Task<DashboardCountStatsDto> GetPendingLabStatsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-30);
        var previousStart = now.AddDays(-60);
        var pendingStatuses = new[]
        {
            LabRequestStatus.Requested,
            LabRequestStatus.SampleCollected,
            LabRequestStatus.InProgress
        };
        var count = await _db.Query<LabRequestItem>()
            .CountAsync(item => pendingStatuses.Contains(item.Status), cancellationToken);
        var current = await _db.Query<LabRequestItem>()
            .CountAsync(item => pendingStatuses.Contains(item.Status) && item.CreatedAt >= start, cancellationToken);
        var previous = await _db.Query<LabRequestItem>()
            .CountAsync(
                item => pendingStatuses.Contains(item.Status) &&
                    item.CreatedAt >= previousStart &&
                    item.CreatedAt < start,
                cancellationToken);

        return new DashboardCountStatsDto
        {
            Count = count,
            Change = FormatChange(current, previous),
            Trend = Trend(current, previous, lowerIsBetter: true)
        };
    }

    public async Task<RevenueMtdStatsDto> GetRevenueMtdStatsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = new DateTime(now.Year, now.Month, 1);
        var previousStart = start.AddMonths(-1);
        var current = await _db.Query<Payment>()
            .Where(payment =>
                payment.Status == PaymentStatus.Paid &&
                payment.PaidAt != null &&
                payment.PaidAt >= start)
            .SumAsync(payment => (decimal?)payment.Amount, cancellationToken) ?? 0m;
        var previous = await _db.Query<Payment>()
            .Where(payment =>
                payment.Status == PaymentStatus.Paid &&
                payment.PaidAt != null &&
                payment.PaidAt >= previousStart &&
                payment.PaidAt < start)
            .SumAsync(payment => (decimal?)payment.Amount, cancellationToken) ?? 0m;

        return new RevenueMtdStatsDto
        {
            Formatted = FormatMoney(current),
            Change = FormatChange(current, previous),
            Trend = Trend(current, previous)
        };
    }

    public async Task<DashboardCountStatsDto> GetOpenNurseTaskStatsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-30);
        var previousStart = now.AddDays(-60);
        var openStatuses = new[] { NurseTaskStatus.Pending, NurseTaskStatus.InProgress };
        var count = await _db.Query<NurseTask>()
            .CountAsync(task => openStatuses.Contains(task.Status), cancellationToken);
        var current = await _db.Query<NurseTask>()
            .CountAsync(task => openStatuses.Contains(task.Status) && task.CreatedAt >= start, cancellationToken);
        var previous = await _db.Query<NurseTask>()
            .CountAsync(
                task => openStatuses.Contains(task.Status) &&
                    task.CreatedAt >= previousStart &&
                    task.CreatedAt < start,
                cancellationToken);

        return new DashboardCountStatsDto
        {
            Count = count,
            Change = FormatChange(current, previous),
            Trend = Trend(current, previous, lowerIsBetter: true)
        };
    }

    public async Task<IReadOnlyList<PatientTrendDto>> GetPatientTrendsAsync(CancellationToken cancellationToken)
    {
        var months = LastMonths(6);
        var start = months[0].Start;
        var encounterGroups = await _db.Query<Encounter>()
            .Where(encounter => encounter.StartedAt >= start)
            .GroupBy(encounter => new
            {
                encounter.StartedAt.Year,
                encounter.StartedAt.Month,
                IsInpatient = encounter.EncounterType == "inpatient" || encounter.EncounterType == "admission"
            })
            .Select(group => new
            {
                group.Key.Year,
                group.Key.Month,
                group.Key.IsInpatient,
                Count = group.Count()
            })
            .ToListAsync(cancellationToken);
        var encounterCounts = encounterGroups.ToDictionary(
            group => (group.Year, group.Month, group.IsInpatient),
            group => group.Count);

        return months.Select(month => new PatientTrendDto
        {
            Month = month.Label,
            Inpatient = encounterCounts.GetValueOrDefault((month.Start.Year, month.Start.Month, true)),
            Outpatient = encounterCounts.GetValueOrDefault((month.Start.Year, month.Start.Month, false))
        }).ToList();
    }

    public async Task<IReadOnlyList<RevenueChartDto>> GetRevenueChartAsync(CancellationToken cancellationToken)
    {
        var months = LastMonths(6);
        var start = months[0].Start;
        var paymentGroups = await _db.Query<Payment>()
            .Where(payment =>
                payment.Status == PaymentStatus.Paid &&
                payment.PaidAt != null &&
                payment.PaidAt >= start)
            .GroupBy(payment => new { payment.PaidAt!.Value.Year, payment.PaidAt!.Value.Month })
            .Select(group => new
            {
                group.Key.Year,
                group.Key.Month,
                Amount = group.Sum(payment => payment.Amount)
            })
            .ToListAsync(cancellationToken);
        var revenueByMonth = paymentGroups.ToDictionary(
            group => (group.Year, group.Month),
            group => group.Amount);

        return months.Select(month => new RevenueChartDto
        {
            Month = month.Label,
            Revenue = decimal.ToInt32(Math.Round(
                revenueByMonth.GetValueOrDefault((month.Start.Year, month.Start.Month)) / 1000m))
        }).ToList();
    }

    public async Task<IReadOnlyList<DepartmentChartDto>> GetDepartmentChartAsync(CancellationToken cancellationToken)
    {
        return await _db.Query<Encounter>()
            .Where(encounter => encounter.DoctorProfile.StaffProfile.Department != null)
            .GroupBy(encounter => encounter.DoctorProfile.StaffProfile.Department!.Name)
            .Select(group => new DepartmentChartDto
            {
                Name = group.Key,
                Patients = group.Select(encounter => encounter.PatientProfileId).Distinct().Count()
            })
            .OrderByDescending(row => row.Patients)
            .Take(8)
            .ToListAsync(cancellationToken);
    }

    public async Task<BedOccupancyDto> GetBedOccupancyAsync(CancellationToken cancellationToken)
    {
        var beds = await _db.Query<Bed>()
            .Select(bed => new
            {
                bed.Ward,
                bed.IsActive,
                Occupied = bed.Assignments.Any(assignment => assignment.ReleasedAt == null)
            })
            .Select(bed => new BedOccupancyRow(bed.Ward, bed.IsActive, bed.Occupied))
            .ToListAsync(cancellationToken);

        var total = beds.Count(bed => bed.IsActive);
        var occupied = beds.Count(bed => bed.IsActive && bed.Occupied);

        return new BedOccupancyDto
        {
            Occupied = occupied,
            Available = Math.Max(total - occupied, 0),
            Total = total,
            IcuPct = WardOccupancy(beds, "icu"),
            EmergencyPct = WardOccupancy(beds, "emergency"),
            GeneralPct = WardOccupancy(beds, "general")
        };
    }

    public async Task<IReadOnlyList<RecentPatientDashboardDto>> GetRecentPatientsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var take = Math.Clamp(limit, 1, 20);
        var patients = await _db.Query<PatientProfile>()
            .OrderByDescending(patient => patient.CreatedAt)
            .Take(take)
            .Select(patient => new
            {
                Name = patient.Person.FirstName + " " + patient.Person.LastName,
                BirthDate = patient.Person.DateOfBirth,
                Department = patient.PrimaryDoctor == null || patient.PrimaryDoctor.StaffProfile.Department == null
                    ? "Unassigned"
                    : patient.PrimaryDoctor.StaffProfile.Department.Name,
                HasActiveBed = _db.Query<BedAssignment>().Any(assignment => assignment.PatientProfileId == patient.Id && assignment.ReleasedAt == null),
                HasOpenEncounter = _db.Query<Encounter>().Any(encounter => encounter.PatientProfileId == patient.Id && encounter.ClosedAt == null),
                patient.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return patients.Select(patient => new RecentPatientDashboardDto
        {
            Name = patient.Name,
            Age = Age(patient.BirthDate),
            Department = patient.Department,
            Status = patient.HasActiveBed ? "Admitted" : patient.HasOpenEncounter ? "In Treatment" : "Waiting",
            Time = RelativeTime(patient.CreatedAt)
        }).ToList();
    }

    public async Task<IReadOnlyList<UpcomingAppointmentDashboardDto>> GetUpcomingAppointmentsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var take = Math.Clamp(limit, 1, 20);
        var now = DateTime.UtcNow;
        var appointments = await _db.Query<Appointment>()
            .Where(appointment => appointment.ScheduledStart >= now && appointment.Status != AppointmentStatus.Cancelled)
            .OrderBy(appointment => appointment.ScheduledStart)
            .Take(take)
            .Select(appointment => new
            {
                Patient = appointment.PatientProfile.Person.FirstName + " " + appointment.PatientProfile.Person.LastName,
                Doctor = "Dr. " + appointment.DoctorProfile.StaffProfile.Person.FirstName + " " + appointment.DoctorProfile.StaffProfile.Person.LastName,
                appointment.ScheduledStart,
                Type = appointment.AppointmentType ?? "Appointment"
            })
            .ToListAsync(cancellationToken);

        return appointments.Select(appointment => new UpcomingAppointmentDashboardDto
        {
            Patient = appointment.Patient,
            Doctor = appointment.Doctor,
            Time = appointment.ScheduledStart.ToLocalTime().ToString("HH:mm"),
            Type = appointment.Type
        }).ToList();
    }

    public async Task<IReadOnlyList<DashboardAlertDto>> GetAlertsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var take = Math.Clamp(limit, 1, 20);
        var alerts = new List<DashboardAlertDto>();
        var pendingLabs = await _db.Query<LabRequestItem>()
            .CountAsync(item => item.Status != LabRequestStatus.Completed && item.Status != LabRequestStatus.Cancelled, cancellationToken);
        var overdueTasks = await _db.Query<NurseTask>()
            .CountAsync(task => task.DueAt != null && task.DueAt < DateTime.UtcNow && task.Status != NurseTaskStatus.Completed, cancellationToken);
        var openBedRequests = await _db.Query<BedAssignmentRequest>()
            .CountAsync(request => request.Status == BedAssignmentRequestStatus.Pending, cancellationToken);
        var paidToday = await _db.Query<Payment>()
            .CountAsync(payment =>
                payment.Status == PaymentStatus.Paid &&
                payment.PaidAt != null &&
                payment.PaidAt >= DateTime.UtcNow.Date,
                cancellationToken);

        if (pendingLabs > 0)
            alerts.Add(Alert("warning", "Pending lab results", $"{pendingLabs} lab items need attention.", "Now"));
        if (overdueTasks > 0)
            alerts.Add(Alert("error", "Overdue nurse tasks", $"{overdueTasks} tasks are past due.", "Now"));
        if (openBedRequests > 0)
            alerts.Add(Alert("info", "Bed requests waiting", $"{openBedRequests} requests need approval.", "Now"));
        if (paidToday > 0)
            alerts.Add(Alert("success", "Payments confirmed", $"{paidToday} payments were confirmed today.", "Today"));

        return alerts.Take(take).ToList();
    }

    private static DashboardAlertDto Alert(string type, string title, string desc, string time)
    {
        return new DashboardAlertDto
        {
            Type = type,
            Title = title,
            Desc = desc,
            Time = time
        };
    }

    private static IReadOnlyList<(DateTime Start, string Label)> LastMonths(int count)
    {
        var current = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        return Enumerable.Range(0, count)
            .Select(offset => current.AddMonths(offset - count + 1))
            .Select(date => (date, date.ToString("MMM")))
            .ToList();
    }

    private static int WardOccupancy(IEnumerable<BedOccupancyRow> beds, string ward)
    {
        var matching = beds
            .Where(bed => bed.IsActive && bed.Ward.Contains(ward, StringComparison.OrdinalIgnoreCase))
            .ToList();
        if (matching.Count == 0)
            return 0;

        return (int)Math.Round(matching.Count(bed => bed.Occupied) * 100m / matching.Count);
    }

    private sealed record BedOccupancyRow(string Ward, bool IsActive, bool Occupied);

    private static int? Age(DateTime? birthDate)
    {
        if (!birthDate.HasValue)
            return null;

        var today = DateTime.UtcNow.Date;
        var age = today.Year - birthDate.Value.Year;
        if (birthDate.Value.Date > today.AddYears(-age))
            age--;
        return age;
    }

    private static string RelativeTime(DateTime value)
    {
        var span = DateTime.UtcNow - value;
        if (span.TotalMinutes < 60)
            return $"{Math.Max(1, (int)span.TotalMinutes)}m ago";
        if (span.TotalHours < 24)
            return $"{(int)span.TotalHours}h ago";
        return $"{(int)span.TotalDays}d ago";
    }

    private static string FormatMoney(decimal value)
    {
        return value.ToString("C0", System.Globalization.CultureInfo.GetCultureInfo("en-US"));
    }

    private static string Trend(decimal current, decimal previous, bool lowerIsBetter = false)
    {
        if (current == previous)
            return "neutral";

        var up = current > previous;
        return lowerIsBetter
            ? up ? "down" : "up"
            : up ? "up" : "down";
    }

    private static string FormatChange(decimal current, decimal previous)
    {
        if (previous == 0)
            return current == 0 ? "0%" : "+100%";

        var value = (current - previous) / previous * 100m;
        return $"{(value >= 0 ? "+" : "")}{Math.Round(value, 1)}%";
    }
}
