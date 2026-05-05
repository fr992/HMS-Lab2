using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ILabTestService
{
    Task<List<LabTestDto>> GetLabTestsAsync(
        bool includeInactive,
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
}
