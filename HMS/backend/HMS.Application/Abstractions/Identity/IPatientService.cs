using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity
{
    public interface IPatientService
    {
        Task<PatientProfileDto> RegisterAsync(RegisterPatientRequestDto request, int? actorUserId, CancellationToken cancellationToken);
        Task<PatientProfileDto> LinkPortalAccountAsync(int patientProfileId, LinkPatientPortalRequestDto request, int? actorUserId, CancellationToken cancellationToken);
        Task<PatientProfileDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
        Task<PatientProfileDto?> GetByIdForCurrentDoctorAsync(int currentUserId, int patientProfileId, CancellationToken cancellationToken);
        Task<List<PatientProfileDto>> GetAllAsync(CancellationToken cancellationToken);
        Task<List<PatientProfileDto>> GetForCurrentDoctorAsync(int currentUserId, CancellationToken cancellationToken);
        Task<DoctorPatientsGroupedDto> GetGroupedForCurrentDoctorAsync(int currentUserId, CancellationToken cancellationToken);
        Task<PatientProfileDto> UpdateAsync(int id, UpdatePatientRequestDto request, int? actorUserId, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
    }
}
