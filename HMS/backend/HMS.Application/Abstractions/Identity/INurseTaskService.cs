using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface INurseTaskService
{
    Task<NurseTaskDto> CreateAsync(CreateNurseTaskRequestDto request, int actorUserId, IEnumerable<string> actorRoles, CancellationToken cancellationToken);
    Task<IReadOnlyList<NurseTaskDto>> GetByEncounterAsync(int encounterId, CancellationToken cancellationToken);
    Task<PaginatedResponse<NurseTaskDto>> GetMyTasksAsync(
        int actorUserId,
        IEnumerable<string> actorRoles,
        string? status,
        string? priority,
        PaginationQuery pagination,
        CancellationToken cancellationToken);
    Task<NurseTaskDto> UpdateAsync(int id, UpdateNurseTaskRequestDto request, int actorUserId, CancellationToken cancellationToken);
    Task<NurseTaskDto> CompleteAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
