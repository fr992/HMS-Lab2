using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ILabResultService
{
    Task<LabResultDto> CreateAsync(
        CreateLabResultDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<LabResultDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<List<LabResultDto>> GetLabResultsAsync(
        int? patientProfileId,
        CancellationToken cancellationToken);

    Task<List<LabResultDto>> GetPublishedForPatientUserAsync(
        int userId,
        CancellationToken cancellationToken);

    Task<LabResultDto> PublishAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<LabResultAttachmentDto?> GetAttachmentAsync(
        int id,
        CancellationToken cancellationToken);

    Task<LabResultAttachmentDto?> GetPublishedAttachmentForPatientUserAsync(
        int id,
        int userId,
        CancellationToken cancellationToken);
}
