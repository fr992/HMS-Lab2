using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IMedicationsService
{
    Task<MedicationDto> CreateAsync(
        CreateMedicationDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<MedicationDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<List<MedicationDto>> GetAllAsync(
        bool? isActive,
        CancellationToken cancellationToken);

    Task<MedicationDto> UpdateAsync(
        int id,
        UpdateMedicationDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken);
}