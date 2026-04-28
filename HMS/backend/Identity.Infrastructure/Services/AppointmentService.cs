using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services.Patients;

public sealed class AppointmentService : IAppointmentService
{
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

            var patientExists = await _db.PatientProfiles.AnyAsync(p => p.Id == request.PatientProfileId, cancellationToken);

            if (!patientExists)
                throw new InvalidOperationException("Patient profile does not exist.");

            var doctorExists = await _db.DoctorProfiles
                 .AnyAsync(d => d.Id == request.DoctorProfileId, cancellationToken);

            if (!doctorExists)
                throw new InvalidOperationException("Doctor profile does not exist.");

            var hasConflict = await _db.Appointments
     .AnyAsync(a =>
         a.DoctorProfileId == request.DoctorProfileId &&
         a.Status != AppointmentStatus.Cancelled &&
         request.ScheduledStart < a.ScheduledEnd &&
         request.ScheduledEnd > a.ScheduledStart,
         cancellationToken);

            if (hasConflict)
                throw new InvalidOperationException("Doctor has a conflicting appointment.");

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
                UpdatedById = actorUserId
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

    public async Task<AppointmentDto?> GetByIdAsync(
    int id, CancellationToken cancellationToken)
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
                    Reason = a.Reason
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

        if (request.ScheduledEnd <= request.ScheduledStart)
            throw new InvalidOperationException("Scheduled end must be after start.");

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
        if(appointment == null)
            throw new InvalidOperationException("Appointment not found.");

        switch (request.Status)
        {
            case AppointmentStatus.Confirmed:
                appointment.Status = AppointmentStatus.Confirmed;
                appointment.ConfirmedAt = DateTime.UtcNow;
                break;

            case AppointmentStatus.Cancelled:
                appointment.Status = AppointmentStatus.Cancelled;
                appointment.CancellationReason = request.CancellationReason;
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
            throw new InvalidOperationException("Invalid appointment status.");
        }

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

        var canReadAll = permissions.Contains("Appointments.Read");
        var canReadOwn = permissions.Contains("Own.Appointments.View");

        if (canReadAll)
        {
            // Admin / Staff see all
        }
        else if (canReadOwn)
        {
            // Patient only own
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

        return await query
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
                Reason = a.Reason
            })
            .ToListAsync(cancellationToken);
    }
}
