using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services.Patients;

public sealed class AppointmentService : IAppointmentService
{
    private const int MinCancellationReasonLength = 3;

    private readonly HmsDbContext _db;

    public AppointmentService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<AppointmentDto> CreateAsync(
        CreateAppointmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (request.ScheduledEnd <= request.ScheduledStart)
                throw new InvalidOperationException("Scheduled end must be after scheduled start.");

            var patientExists = await _db.PatientProfiles.AnyAsync(
                p => p.Id == request.PatientProfileId,
                cancellationToken);

            if (!patientExists)
                throw new InvalidOperationException("Patient profile does not exist.");

            var doctorExists = await _db.DoctorProfiles.AnyAsync(
                d => d.Id == request.DoctorProfileId,
                cancellationToken);

            if (!doctorExists)
                throw new InvalidOperationException("Doctor profile does not exist.");

            await EnsureNoDoctorScheduleConflictAsync(
                request.DoctorProfileId,
                request.ScheduledStart,
                request.ScheduledEnd,
                excludeAppointmentId: null,
                cancellationToken);

            var appointment = new Appointment
            {
                PatientProfileId = request.PatientProfileId,
                DoctorProfileId = request.DoctorProfileId,
                DepartmentId = request.DepartmentId,

                ScheduledStart = request.ScheduledStart,
                ScheduledEnd = request.ScheduledEnd,

                Status = AppointmentStatus.Scheduled,
                AppointmentType = request.AppointmentType,
                Reason = request.Reason,

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = actorUserId,
                UpdatedById = actorUserId,
            };

            _db.Appointments.Add(appointment);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return await GetByIdAsync(appointment.Id, cancellationToken)
                ?? throw new InvalidOperationException("Appointment created but could not be loaded.");
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<AppointmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.Appointments
            .AsNoTracking()
            .Include(a => a.PatientProfile)
            .ThenInclude(p => p.Person)
            .Include(a => a.DoctorProfile)
            .ThenInclude(d => d.StaffProfile)
            .Include(a => a.Department)
            .Where(a => a.Id == id)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,

                PatientProfileId = a.PatientProfileId,
                PatientName = a.PatientProfile.Person.FullName,

                DoctorProfileId = a.DoctorProfileId,
                DoctorName = a.DoctorProfile.StaffProfile.Person.FullName,

                DepartmentId = a.DepartmentId,
                DepartmentName = a.Department != null ? a.Department.Name : null,

                ScheduledStart = a.ScheduledStart,
                ScheduledEnd = a.ScheduledEnd,

                Status = a.Status,
                AppointmentType = a.AppointmentType,
                Reason = a.Reason,
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AppointmentDto> UpdateAsync(
        int id,
        UpdateAppointmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (appointment == null)
            throw new InvalidOperationException("Appointment not found.");

        EnsureAppointmentEditable(appointment.Status);

        if (request.ScheduledEnd <= request.ScheduledStart)
            throw new InvalidOperationException("Scheduled end must be after start.");

        await EnsureNoDoctorScheduleConflictAsync(
            request.DoctorProfileId,
            request.ScheduledStart,
            request.ScheduledEnd,
            excludeAppointmentId: id,
            cancellationToken);

        appointment.ScheduledStart = request.ScheduledStart;
        appointment.ScheduledEnd = request.ScheduledEnd;
        appointment.DoctorProfileId = request.DoctorProfileId;
        appointment.DepartmentId = request.DepartmentId;
        appointment.AppointmentType = request.AppointmentType;
        appointment.Reason = request.Reason;

        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(appointment.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    public async Task<AppointmentDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (appointment == null)
            throw new InvalidOperationException("Appointment not found.");

        var targetStatus = AppointmentStatus.NormalizeToKnownStatus(request.Status);

        AppointmentStatus.EnsureCanTransition(appointment.Status, targetStatus);

        ApplyStatusTransition(appointment, targetStatus, request, actorUserId);

        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    public async Task<List<AppointmentDto>> GetAppointmentsAsync(
        int actorUserId,
        IEnumerable<string> permissions,
        DateTimeOffset? date,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var query = _db.Appointments
            .AsNoTracking()
            .Include(a => a.PatientProfile)
            .ThenInclude(p => p.Person)
            .Include(a => a.DoctorProfile)
            .ThenInclude(d => d.StaffProfile)
            .ThenInclude(s => s.Person)
            .Include(a => a.Department)
            .AsQueryable();

        var permissionList = permissions as IList<string> ?? permissions.ToList();
        var canReadAll = permissionList.Contains("Appointments.Read");
        var canReadOwn = permissionList.Contains("Own.Appointments.View");

        if (canReadAll)
        {
            // Admin / Staff see all
        }
        else if (canReadOwn)
        {
            query = query.Where(a =>
                a.PatientProfile.Person.UserId == actorUserId);
        }
        else
        {
            throw new UnauthorizedAccessException("No permission to view appointments.");
        }

        if (date.HasValue)
        {
            var day = date.Value.Date;
            var nextDay = day.AddDays(1);

            query = query.Where(a =>
                a.ScheduledStart >= day &&
                a.ScheduledStart < nextDay);
        }
        else
        {
            if (from.HasValue && to.HasValue && to.Value <= from.Value)
                throw new InvalidOperationException("End of date range must be after start.");

            if (from.HasValue)
            {
                var rangeStart = from.Value.UtcDateTime;
                query = query.Where(a => a.ScheduledStart >= rangeStart);
            }

            if (to.HasValue)
            {
                var rangeEnd = to.Value.UtcDateTime;
                query = query.Where(a => a.ScheduledStart < rangeEnd);
            }
        }

        return await query
            .OrderBy(a => a.ScheduledStart)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                PatientProfileId = a.PatientProfileId,
                PatientName = a.PatientProfile.Person.FullName,
                DoctorProfileId = a.DoctorProfileId,
                DoctorName = a.DoctorProfile.StaffProfile.Person.FullName,
                DepartmentId = a.DepartmentId,
                DepartmentName = a.Department != null ? a.Department.Name : null,
                ScheduledStart = a.ScheduledStart,
                ScheduledEnd = a.ScheduledEnd,
                Status = a.Status,
                AppointmentType = a.AppointmentType,
                Reason = a.Reason,
            })
            .ToListAsync(cancellationToken);
    }

    private static void EnsureAppointmentEditable(string currentStatus)
    {
        if (string.Equals(currentStatus, AppointmentStatus.Completed, StringComparison.Ordinal)
            || string.Equals(currentStatus, AppointmentStatus.Cancelled, StringComparison.Ordinal)
            || string.Equals(currentStatus, AppointmentStatus.NoShow, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "This appointment can no longer be edited.");
        }
    }

    private static void ApplyStatusTransition(
        Appointment appointment,
        string targetStatus,
        UpdateAppointmentStatusDto request,
        int? actorUserId)
    {
        switch (targetStatus)
        {
            case AppointmentStatus.Confirmed:
                appointment.Status = AppointmentStatus.Confirmed;
                appointment.ConfirmedAt ??= DateTime.UtcNow;
                break;

            case AppointmentStatus.Cancelled:
                var reason = request.CancellationReason?.Trim() ?? string.Empty;
                if (reason.Length < MinCancellationReasonLength)
                {
                    throw new InvalidOperationException(
                        $"Cancellation reason must be at least {MinCancellationReasonLength} characters.");
                }

                appointment.Status = AppointmentStatus.Cancelled;
                appointment.CancellationReason = reason;
                appointment.CancelledAt = DateTime.UtcNow;
                appointment.CancelledByUserId = actorUserId;
                break;

            case AppointmentStatus.Completed:
                appointment.Status = AppointmentStatus.Completed;
                break;

            case AppointmentStatus.NoShow:
                appointment.Status = AppointmentStatus.NoShow;
                break;

            default:
                throw new InvalidOperationException(
                    $"Unsupported target status '{targetStatus}'.");
        }
    }

    private async Task EnsureNoDoctorScheduleConflictAsync(
        int doctorProfileId,
        DateTime scheduledStart,
        DateTime scheduledEnd,
        int? excludeAppointmentId,
        CancellationToken cancellationToken)
    {
        var hasConflict = await _db.Appointments.AnyAsync(
            a =>
                a.DoctorProfileId == doctorProfileId
                && a.Status != AppointmentStatus.Cancelled
                && (!excludeAppointmentId.HasValue || a.Id != excludeAppointmentId.Value)
                && scheduledStart < a.ScheduledEnd
                && scheduledEnd > a.ScheduledStart,
            cancellationToken);

        if (hasConflict)
            throw new InvalidOperationException("Doctor has a conflicting appointment.");
    }
}
