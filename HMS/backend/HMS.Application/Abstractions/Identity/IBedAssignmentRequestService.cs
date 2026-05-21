using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IBedAssignmentRequestService
{
    Task<BedAssignmentRequestDto> CreateForEncounterAsync(
        int encounterId,
        CreateBedAssignmentRequestDto request,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<BedAssignmentRequestDto>> GetForEncounterAsync(
        int encounterId,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<BedAssignmentRequestDto>> GetRequestsAsync(
        string? status,
        CancellationToken cancellationToken);

    Task<BedAssignmentRequestDto> AssignAsync(
        int requestId,
        AssignBedAssignmentRequestDto request,
        int actorUserId,
        CancellationToken cancellationToken);

    Task<BedAssignmentRequestDto> RejectAsync(
        int requestId,
        RejectBedAssignmentRequestDto request,
        int actorUserId,
        CancellationToken cancellationToken);
}
