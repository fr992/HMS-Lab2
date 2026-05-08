using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ILabRequestService
{
    Task<LabRequestDto> CreateAsync(
        int encounterId,
        CreateLabRequestDto request,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken);

    Task<LabRequestDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<List<LabRequestDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken);

    Task<List<LabRequestDto>> GetLabRequestsAsync(
        string? status,
        CancellationToken cancellationToken);

    Task<LabRequestDto> UpdateStatusAsync(
        int id,
        UpdateLabRequestStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken);
}
