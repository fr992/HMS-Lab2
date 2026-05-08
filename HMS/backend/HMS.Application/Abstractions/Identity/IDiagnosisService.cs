using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IDiagnosisService
{
    Task<DiagnosisDto> CreateAsync(
        int encounterId,
        CreateDiagnosisDto request,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken);

    Task<List<DiagnosisDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken);
}
