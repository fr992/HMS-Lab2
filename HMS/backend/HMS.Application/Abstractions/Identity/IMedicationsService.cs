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

    Task<PaginatedResponse<MedicationDto>> GetAllAsync(
        bool? isActive,
        PaginationQuery pagination,
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
