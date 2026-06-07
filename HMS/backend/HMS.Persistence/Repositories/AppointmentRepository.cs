using HMS.Application.Abstractions.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HMS.Persistence.Repositories;

public sealed class AppointmentRepository : EfRepository<Appointment>, IAppointmentRepository
{
    private readonly HmsDbContext _db;

    public AppointmentRepository(HmsDbContext db)
        : base(db)
    {
        _db = db;
    }

    public async Task<bool> PatientExistsAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default)
    {
        return await _db.PatientProfiles.AnyAsync(
            patient => patient.Id == patientProfileId,
            cancellationToken);
    }

    public async Task<bool> DoctorExistsAsync(
        int doctorProfileId,
        CancellationToken cancellationToken = default)
    {
        return await _db.DoctorProfiles.AnyAsync(
            doctor => doctor.Id == doctorProfileId,
            cancellationToken);
    }

    public async Task<bool> HasDoctorScheduleConflictAsync(
        int doctorProfileId,
        DateTime scheduledStart,
        DateTime scheduledEnd,
        int? excludedAppointmentId = null,
        CancellationToken cancellationToken = default)
    {
        return await _db.Appointments.AnyAsync(
            appointment =>
                appointment.DoctorProfileId == doctorProfileId
                && appointment.Status != AppointmentStatus.Cancelled
                && (!excludedAppointmentId.HasValue || appointment.Id != excludedAppointmentId.Value)
                && scheduledStart < appointment.ScheduledEnd
                && scheduledEnd > appointment.ScheduledStart,
            cancellationToken);
    }

    public async Task<int?> GetPatientUserIdAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default)
    {
        return await _db.PatientProfiles
            .AsNoTracking()
            .Where(patient => patient.Id == patientProfileId)
            .Select(patient => patient.Person.UserId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int?> GetDoctorUserIdAsync(
        int doctorProfileId,
        CancellationToken cancellationToken = default)
    {
        return await _db.DoctorProfiles
            .AsNoTracking()
            .Where(doctor => doctor.Id == doctorProfileId)
            .Select(doctor => doctor.StaffProfile.Person.UserId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int?> GetDoctorProfileIdByUserIdAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        return await _db.DoctorProfiles
            .AsNoTracking()
            .Where(doctor => doctor.StaffProfile.Person.UserId == userId)
            .Select(doctor => (int?)doctor.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
