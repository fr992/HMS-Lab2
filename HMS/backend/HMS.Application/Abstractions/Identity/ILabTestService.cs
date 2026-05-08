using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ILabTestService
{
    Task<PaginatedResponse<LabTestDto>> GetLabTestsAsync(
        bool? isActive,
        PaginationQuery pagination,
        CancellationToken cancellationToken);

    Task<LabTestDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<LabTestDto> CreateAsync(
        CreateLabTestDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<LabTestDto> UpdateAsync(
        int id,
        UpdateLabTestDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken
        );
}
