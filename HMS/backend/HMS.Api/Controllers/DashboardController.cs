using HMS.Api.Authorization;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly HmsDbContext _db;

    public DashboardController(HmsDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats/patients")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<object>> PatientStats(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-30);
        var previousStart = now.AddDays(-60);
        var total = await _db.PatientProfiles.AsNoTracking().CountAsync(cancellationToken);
        var current = await _db.PatientProfiles.AsNoTracking().CountAsync(x => x.CreatedAt >= start, cancellationToken);
        var previous = await _db.PatientProfiles.AsNoTracking().CountAsync(x => x.CreatedAt >= previousStart && x.CreatedAt < start, cancellationToken);

        return Ok(new { total, change = FormatChange(current, previous), trend = Trend(current, previous) });
    }

    [HttpGet("stats/appointments/today")]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<object>> TodayAppointmentStats(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var yesterday = today.AddDays(-1);
        var count = await _db.Appointments.AsNoTracking()
            .CountAsync(x => x.ScheduledStart >= today && x.ScheduledStart < tomorrow, cancellationToken);
        var previous = await _db.Appointments.AsNoTracking()
            .CountAsync(x => x.ScheduledStart >= yesterday && x.ScheduledStart < today, cancellationToken);

        return Ok(new { count, change = FormatChange(count, previous), trend = Trend(count, previous) });
    }

    [HttpGet("stats/doctors/active")]
    [RequirePermission("Users.Read")]
    public async Task<ActionResult<object>> ActiveDoctorStats(CancellationToken cancellationToken)
    {
        var count = await _db.DoctorProfiles.AsNoTracking().CountAsync(x => x.IsActive, cancellationToken);
        return Ok(new { count, label = "On duty" });
    }

    [HttpGet("stats/lab/pending")]
    [RequirePermission("LabRequests.Read")]
    public async Task<ActionResult<object>> PendingLabStats(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-30);
        var previousStart = now.AddDays(-60);
        var pendingStatuses = new[] { LabRequestStatus.Requested, LabRequestStatus.SampleCollected, LabRequestStatus.InProgress };
        var count = await _db.LabRequestItems.AsNoTracking()
            .CountAsync(x => pendingStatuses.Contains(x.Status), cancellationToken);
        var current = await _db.LabRequestItems.AsNoTracking()
            .CountAsync(x => pendingStatuses.Contains(x.Status) && x.CreatedAt >= start, cancellationToken);
        var previous = await _db.LabRequestItems.AsNoTracking()
            .CountAsync(x => pendingStatuses.Contains(x.Status) && x.CreatedAt >= previousStart && x.CreatedAt < start, cancellationToken);

        return Ok(new { count, change = FormatChange(current, previous), trend = Trend(current, previous, lowerIsBetter: true) });
    }

    [HttpGet("stats/revenue/mtd")]
    [RequirePermission("Invoices.Read")]
    public async Task<ActionResult<object>> RevenueMtdStats(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = new DateTime(now.Year, now.Month, 1);
        var previousStart = start.AddMonths(-1);
        var paidStatuses = new[] { InvoiceStatus.Paid, InvoiceStatus.PartiallyPaid };
        var current = await _db.Invoices.AsNoTracking()
            .Where(x => paidStatuses.Contains(x.Status) && x.IssuedAt >= start)
            .SumAsync(x => (decimal?)x.TotalAmount, cancellationToken) ?? 0m;
        var previous = await _db.Invoices.AsNoTracking()
            .Where(x => paidStatuses.Contains(x.Status) && x.IssuedAt >= previousStart && x.IssuedAt < start)
            .SumAsync(x => (decimal?)x.TotalAmount, cancellationToken) ?? 0m;

        return Ok(new { formatted = FormatMoney(current), change = FormatChange(current, previous), trend = Trend(current, previous) });
    }

    [HttpGet("stats/nurse-tasks/open")]
    [RequirePermission("NurseTasks.Read")]
    public async Task<ActionResult<object>> OpenNurseTaskStats(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.AddDays(-30);
        var previousStart = now.AddDays(-60);
        var openStatuses = new[] { NurseTaskStatus.Pending, NurseTaskStatus.InProgress };
        var count = await _db.NurseTasks.AsNoTracking().CountAsync(x => openStatuses.Contains(x.Status), cancellationToken);
        var current = await _db.NurseTasks.AsNoTracking().CountAsync(x => openStatuses.Contains(x.Status) && x.CreatedAt >= start, cancellationToken);
        var previous = await _db.NurseTasks.AsNoTracking().CountAsync(x => openStatuses.Contains(x.Status) && x.CreatedAt >= previousStart && x.CreatedAt < start, cancellationToken);

        return Ok(new { count, change = FormatChange(current, previous), trend = Trend(current, previous, lowerIsBetter: true) });
    }

    [HttpGet("charts/patient-trends")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<object>>> PatientTrends(CancellationToken cancellationToken)
    {
        var months = LastMonths(6);
        var start = months[0].Start;
        var encounters = await _db.Encounters.AsNoTracking()
            .Where(x => x.StartedAt >= start)
            .Select(x => new { x.StartedAt, x.EncounterType })
            .ToListAsync(cancellationToken);

        return Ok(months.Select(month => new
        {
            month = month.Label,
            inpatient = encounters.Count(x => IsInMonth(x.StartedAt, month.Start) && IsInpatient(x.EncounterType)),
            outpatient = encounters.Count(x => IsInMonth(x.StartedAt, month.Start) && !IsInpatient(x.EncounterType))
        }));
    }

    [HttpGet("charts/revenue")]
    [RequirePermission("Invoices.Read")]
    public async Task<ActionResult<IReadOnlyList<object>>> RevenueChart(CancellationToken cancellationToken)
    {
        var months = LastMonths(6);
        var start = months[0].Start;
        var invoices = await _db.Invoices.AsNoTracking()
            .Where(x => x.IssuedAt >= start && x.Status != InvoiceStatus.Cancelled)
            .Select(x => new { x.IssuedAt, x.TotalAmount })
            .ToListAsync(cancellationToken);

        return Ok(months.Select(month => new
        {
            month = month.Label,
            revenue = decimal.ToInt32(Math.Round(invoices
                .Where(x => IsInMonth(x.IssuedAt, month.Start))
                .Sum(x => x.TotalAmount) / 1000m))
        }));
    }

    [HttpGet("charts/departments")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<object>>> DepartmentChart(CancellationToken cancellationToken)
    {
        var data = await _db.Encounters.AsNoTracking()
            .Where(x => x.DoctorProfile.StaffProfile.Department != null)
            .GroupBy(x => x.DoctorProfile.StaffProfile.Department!.Name)
            .Select(group => new { name = group.Key, patients = group.Select(x => x.PatientProfileId).Distinct().Count() })
            .OrderByDescending(x => x.patients)
            .Take(8)
            .ToListAsync(cancellationToken);

        return Ok(data);
    }

    [HttpGet("beds/occupancy")]
    [RequirePermission("Beds.Read")]
    public async Task<ActionResult<object>> BedOccupancy(CancellationToken cancellationToken)
    {
        var beds = await _db.Beds.AsNoTracking()
            .Select(x => new
            {
                x.Ward,
                x.IsActive,
                occupied = x.Assignments.Any(a => a.ReleasedAt == null)
            })
            .Select(x => new BedOccupancyRow(x.Ward, x.IsActive, x.occupied))
            .ToListAsync(cancellationToken);

        var total = beds.Count(x => x.IsActive);
        var occupied = beds.Count(x => x.IsActive && x.occupied);
        var available = Math.Max(total - occupied, 0);

        return Ok(new
        {
            occupied,
            available,
            total,
            icu_pct = WardOccupancy(beds, "icu"),
            emergency_pct = WardOccupancy(beds, "emergency"),
            general_pct = WardOccupancy(beds, "general")
        });
    }

    [HttpGet("patients/recent")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<object>>> RecentPatients([FromQuery] int limit = 5, CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 20);
        var patients = await _db.PatientProfiles.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .Select(x => new
            {
                name = x.Person.FirstName + " " + x.Person.LastName,
                birthDate = x.Person.DateOfBirth,
                department = x.PrimaryDoctor == null || x.PrimaryDoctor.StaffProfile.Department == null
                    ? "Unassigned"
                    : x.PrimaryDoctor.StaffProfile.Department.Name,
                hasActiveBed = _db.BedAssignments.Any(a => a.PatientProfileId == x.Id && a.ReleasedAt == null),
                hasOpenEncounter = _db.Encounters.Any(e => e.PatientProfileId == x.Id && e.ClosedAt == null),
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(patients.Select(x => new
        {
            x.name,
            age = Age(x.birthDate),
            x.department,
            status = x.hasActiveBed ? "Admitted" : x.hasOpenEncounter ? "In Treatment" : "Waiting",
            time = RelativeTime(x.CreatedAt)
        }));
    }

    [HttpGet("appointments/upcoming")]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<IReadOnlyList<object>>> UpcomingAppointments([FromQuery] int limit = 4, CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 20);
        var now = DateTime.UtcNow;
        var appointments = await _db.Appointments.AsNoTracking()
            .Where(x => x.ScheduledStart >= now && x.Status != AppointmentStatus.Cancelled)
            .OrderBy(x => x.ScheduledStart)
            .Take(limit)
            .Select(x => new
            {
                patient = x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName,
                doctor = "Dr. " + x.DoctorProfile.StaffProfile.Person.FirstName + " " + x.DoctorProfile.StaffProfile.Person.LastName,
                x.ScheduledStart,
                type = x.AppointmentType ?? "Appointment"
            })
            .ToListAsync(cancellationToken);

        return Ok(appointments.Select(x => new
        {
            x.patient,
            x.doctor,
            time = x.ScheduledStart.ToLocalTime().ToString("HH:mm"),
            x.type
        }));
    }

    [HttpGet("alerts")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<object>>> Alerts([FromQuery] int limit = 4, CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 20);
        var alerts = new List<object>();
        var pendingLabs = await _db.LabRequestItems.AsNoTracking()
            .CountAsync(x => x.Status != LabRequestStatus.Completed && x.Status != LabRequestStatus.Cancelled, cancellationToken);
        var overdueTasks = await _db.NurseTasks.AsNoTracking()
            .CountAsync(x => x.DueAt != null && x.DueAt < DateTime.UtcNow && x.Status != NurseTaskStatus.Completed, cancellationToken);
        var openBedRequests = await _db.BedAssignmentRequests.AsNoTracking()
            .CountAsync(x => x.Status == BedAssignmentRequestStatus.Pending, cancellationToken);
        var paidToday = await _db.Payments.AsNoTracking()
            .CountAsync(x => x.Status == PaymentStatus.Paid && x.PaidAt != null && x.PaidAt >= DateTime.UtcNow.Date, cancellationToken);

        if (pendingLabs > 0)
            alerts.Add(Alert("warning", "Pending lab results", $"{pendingLabs} lab items need attention.", "Now"));
        if (overdueTasks > 0)
            alerts.Add(Alert("error", "Overdue nurse tasks", $"{overdueTasks} tasks are past due.", "Now"));
        if (openBedRequests > 0)
            alerts.Add(Alert("info", "Bed requests waiting", $"{openBedRequests} requests need approval.", "Now"));
        if (paidToday > 0)
            alerts.Add(Alert("success", "Payments confirmed", $"{paidToday} payments were confirmed today.", "Today"));

        return Ok(alerts.Take(limit));
    }

    private static object Alert(string type, string title, string desc, string time) => new { type, title, desc, time };

    private static IReadOnlyList<(DateTime Start, string Label)> LastMonths(int count)
    {
        var current = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        return Enumerable.Range(0, count)
            .Select(offset => current.AddMonths(offset - count + 1))
            .Select(date => (date, date.ToString("MMM")))
            .ToList();
    }

    private static bool IsInMonth(DateTime value, DateTime month) =>
        value >= month && value < month.AddMonths(1);

    private static bool IsInpatient(string? type) =>
        string.Equals(type, "inpatient", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(type, "admission", StringComparison.OrdinalIgnoreCase);

    private static int WardOccupancy(IEnumerable<BedOccupancyRow> beds, string ward)
    {
        var matching = beds.Where(x => x.IsActive && x.Ward.Contains(ward, StringComparison.OrdinalIgnoreCase)).ToList();
        if (matching.Count == 0)
            return 0;

        return (int)Math.Round(matching.Count(x => x.occupied) * 100m / matching.Count);
    }

    private sealed record BedOccupancyRow(string Ward, bool IsActive, bool occupied);

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

    private static string FormatMoney(decimal value) =>
        value.ToString("C0", System.Globalization.CultureInfo.GetCultureInfo("en-US"));

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
