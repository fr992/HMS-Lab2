using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IEncounterService
{
    Task<EncounterDto> CreateAsync(CreateEncounterDto request, int? actorUserId, CancellationToken cancellationToken);
    Task<EncounterDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<List<EncounterDto>> GetEncountersAsync(int? patientProfileId, int? doctorProfileId, CancellationToken cancellationToken);
    Task<EncounterDto> UpdateAsync(int id, UpdateEncounterDto request, int? actorUserId, CancellationToken cancellationToken);
    Task<EncounterDto> UpdateStatusAsync(int id, UpdateEncounterStatusDto request, int? actorUserId, CancellationToken cancellationToken);
}