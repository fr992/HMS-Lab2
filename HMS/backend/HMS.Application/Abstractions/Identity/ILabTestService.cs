using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ILabTestService
{
    Task<List<LabTestDto>> GetLabTestsAsync(
        bool? isActive,
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

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken
        );
}
