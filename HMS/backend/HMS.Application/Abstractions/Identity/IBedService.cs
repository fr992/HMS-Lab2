using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IBedService
{
    Task<IReadOnlyList<BedDto>> GetBedsAsync(string? status, int? departmentId, CancellationToken cancellationToken);
    Task<BedDto> GetBedAsync(int id, CancellationToken cancellationToken);
    Task<BedDto> CreateBedAsync(CreateBedDto request, int actorUserId, CancellationToken cancellationToken);
    Task<BedDto> UpdateBedAsync(int id, UpdateBedDto request, int actorUserId, CancellationToken cancellationToken);
    Task<BedAssignmentDto> AssignAsync(int bedId, AssignBedDto request, int actorUserId, CancellationToken cancellationToken);
    Task<BedAssignmentDto> ReleaseByBedAsync(int bedId, ReleaseBedDto request, int actorUserId, CancellationToken cancellationToken);
    Task<BedAssignmentDto> ReleaseAssignmentAsync(int assignmentId, ReleaseBedDto request, int actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<BedAssignmentDto>> GetActiveAssignmentsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<BedPatientDetailsDto>> GetBedsWithOccupancyByDepartmentAsync(int actorUserId, CancellationToken cancellationToken);
}
