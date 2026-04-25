using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity
{
    public interface IPatientService
    {
        Task<PatientProfileDto> RegisterAsync(RegisterPatientRequestDto request, CancellationToken cancellationToken);
        Task<PatientProfileDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
        Task<List<PatientProfileDto>> GetAllAsync(CancellationToken cancellationToken);
        Task<PatientProfileDto> UpdateAsync(int id, UpdatePatientRequestDto request, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
    }
}
