using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class DoctorDashboardService : IDoctorDashboardService
{
    private readonly HmsDbContext _db;

    public DoctorDashboardService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<DoctorDashboardDto> GetForCurrentDoctorAsync(
        int currentUserId,
        CancellationToken cancellationToken)
    {
        var doctor = await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d => d.IsActive && d.StaffProfile.Person.UserId == currentUserId)
            .Select(d => new
            {
                d.Id,
                DoctorName = d.StaffProfile.Person.FirstName + " " + d.StaffProfile.Person.LastName
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (doctor is null)
            throw new InvalidOperationException("Current user is not linked to an active doctor profile.");

        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);

        var interactedPatientIds = _db.Appointments
            .Where(a => a.DoctorProfileId == doctor.Id)
            .Select(a => a.PatientProfileId)
            .Concat(
                _db.Encounters
                    .Where(e => e.DoctorProfileId == doctor.Id)
                    .Select(e => e.PatientProfileId)
            )
            .Distinct();

        var primaryPatientsCount = await _db.PatientProfiles
            .AsNoTracking()
            .CountAsync(p => p.PrimaryDoctorId == doctor.Id, cancellationToken);

        var interactedPatientsCount = await _db.PatientProfiles
            .AsNoTracking()
            .CountAsync(
                p => interactedPatientIds.Contains(p.Id) && p.PrimaryDoctorId != doctor.Id,
                cancellationToken);

        var todayAppointmentsCount = await _db.Appointments
            .AsNoTracking()
            .CountAsync(
                a => a.DoctorProfileId == doctor.Id
                    && a.ScheduledStart >= today
                    && a.ScheduledStart < tomorrow,
                cancellationToken);

        var upcomingAppointmentsCount = await _db.Appointments
            .AsNoTracking()
            .CountAsync(
                a => a.DoctorProfileId == doctor.Id
                    && a.ScheduledStart >= now
                    && a.Status != AppointmentStatus.Cancelled
                    && a.Status != AppointmentStatus.Completed
                    && a.Status != AppointmentStatus.NoShow,
                cancellationToken);

        var openEncountersCount = await _db.Encounters
            .AsNoTracking()
            .CountAsync(
                e => e.DoctorProfileId == doctor.Id
                    && e.Status == EncounterStatus.Open,
                cancellationToken);

        var completedEncountersCount = await _db.Encounters
            .AsNoTracking()
            .CountAsync(
                e => e.DoctorProfileId == doctor.Id
                    && e.Status == EncounterStatus.Completed,
                cancellationToken);

        var todaySchedule = await _db.Appointments
            .AsNoTracking()
            .Where(a =>
                a.DoctorProfileId == doctor.Id
                && a.ScheduledStart >= today
                && a.ScheduledStart < tomorrow)
            .OrderBy(a => a.ScheduledStart)
            .Select(a => new DoctorDashboardScheduleDto
            {
                AppointmentId = a.Id,
                PatientName = a.PatientProfile.Person.FirstName + " " + a.PatientProfile.Person.LastName,
                AppointmentType = a.AppointmentType,
                ScheduledStart = a.ScheduledStart,
                ScheduledEnd = a.ScheduledEnd,
                Status = a.Status,
                Reason = a.Reason
            })
            .ToListAsync(cancellationToken);

        var relatedPatientIdsQuery = _db.PatientProfiles
            .Where(p => p.PrimaryDoctorId == doctor.Id)
            .Select(p => p.Id)
            .Concat(interactedPatientIds)
            .Distinct();

        var recentPatientBase = await _db.PatientProfiles
            .AsNoTracking()
            .Where(p => relatedPatientIdsQuery.Contains(p.Id))
            .Select(p => new
            {
                p.Id,
                FullName = p.Person.FirstName + " " + p.Person.LastName,
                p.Person.DateOfBirth,
                PrimaryDepartmentName = p.PrimaryDoctor != null && p.PrimaryDoctor.StaffProfile.Department != null
                    ? p.PrimaryDoctor.StaffProfile.Department.Name
                    : null,
                p.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var relatedPatientIds = recentPatientBase.Select(p => p.Id).ToList();

        var latestAppointments = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.DoctorProfileId == doctor.Id && relatedPatientIds.Contains(a.PatientProfileId))
            .GroupBy(a => a.PatientProfileId)
            .Select(g => g
                .OrderByDescending(a => a.ScheduledStart)
                .Select(a => new
                {
                    PatientProfileId = g.Key,
                    ActivityAt = (DateTime?)a.ScheduledStart,
                    a.Status,
                    DepartmentName = a.Department != null ? a.Department.Name : null
                })
                .FirstOrDefault())
            .ToListAsync(cancellationToken);

        var latestEncounters = await _db.Encounters
            .AsNoTracking()
            .Where(e => e.DoctorProfileId == doctor.Id && relatedPatientIds.Contains(e.PatientProfileId))
            .GroupBy(e => e.PatientProfileId)
            .Select(g => g
                .OrderByDescending(e => e.StartedAt)
                .ThenByDescending(e => e.CreatedAt)
                .Select(e => new
                {
                    PatientProfileId = g.Key,
                    ActivityAt = (DateTime?)(e.StartedAt == default ? e.CreatedAt : e.StartedAt),
                    e.Status
                })
                .FirstOrDefault())
            .ToListAsync(cancellationToken);

        var latestAppointmentsByPatient = latestAppointments
            .Where(a => a != null)
            .ToDictionary(a => a!.PatientProfileId);
        var latestEncountersByPatient = latestEncounters
            .Where(e => e != null)
            .ToDictionary(e => e!.PatientProfileId);

        var recentPatients = recentPatientBase
            .Select(p =>
            {
                latestAppointmentsByPatient.TryGetValue(p.Id, out var appointment);
                latestEncountersByPatient.TryGetValue(p.Id, out var encounter);

                var appointmentAt = appointment?.ActivityAt;
                var encounterAt = encounter?.ActivityAt;
                var useEncounterStatus = encounterAt.HasValue
                    && (!appointmentAt.HasValue || encounterAt >= appointmentAt);
                var lastActivityAt = LatestDate(appointmentAt, encounterAt, p.CreatedAt);

                return new DoctorDashboardRecentPatientDto
                {
                    PatientProfileId = p.Id,
                    FullName = p.FullName.Trim(),
                    DepartmentName = !string.IsNullOrWhiteSpace(appointment?.DepartmentName)
                        ? appointment.DepartmentName
                        : p.PrimaryDepartmentName,
                    Age = CalculateAge(p.DateOfBirth, today),
                    Status = useEncounterStatus ? encounter?.Status : appointment?.Status,
                    LastActivityAt = lastActivityAt
                };
            })
            .OrderByDescending(p => p.LastActivityAt)
            .Take(5)
            .ToList();

        return new DoctorDashboardDto
        {
            DoctorName = doctor.DoctorName,
            TodayAppointmentsCount = todayAppointmentsCount,
            UpcomingAppointmentsCount = upcomingAppointmentsCount,
            PrimaryPatientsCount = primaryPatientsCount,
            InteractedPatientsCount = interactedPatientsCount,
            OpenEncountersCount = openEncountersCount,
            CompletedEncountersCount = completedEncountersCount,
            RecentPatients = recentPatients,
            TodaySchedule = todaySchedule
        };
    }

    private static DateTime? LatestDate(DateTime? first, DateTime? second, DateTime fallback)
    {
        if (first.HasValue && second.HasValue)
            return first >= second ? first : second;
        if (first.HasValue)
            return first;
        if (second.HasValue)
            return second;
        return fallback;
    }

    private static int? CalculateAge(DateTime? dateOfBirth, DateTime today)
    {
        if (!dateOfBirth.HasValue)
            return null;

        var age = today.Year - dateOfBirth.Value.Year;
        if (dateOfBirth.Value.Date > today.AddYears(-age))
            age--;

        return age < 0 ? null : age;
    }

}
