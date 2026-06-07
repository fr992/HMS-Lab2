using Identity.Domain.Entities;

namespace HMS.Application.Abstractions.Persistence;

public interface IAppointmentRepository : IRepository<Appointment>
{
    Task<bool> PatientExistsAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default);

    Task<bool> DoctorExistsAsync(
        int doctorProfileId,
        CancellationToken cancellationToken = default);

    Task<bool> HasDoctorScheduleConflictAsync(
        int doctorProfileId,
        DateTime scheduledStart,
        DateTime scheduledEnd,
        int? excludedAppointmentId = null,
        CancellationToken cancellationToken = default);

    Task<int?> GetPatientUserIdAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default);

    Task<int?> GetDoctorUserIdAsync(
        int doctorProfileId,
        CancellationToken cancellationToken = default);

    Task<int?> GetDoctorProfileIdByUserIdAsync(
        int userId,
        CancellationToken cancellationToken = default);
}
