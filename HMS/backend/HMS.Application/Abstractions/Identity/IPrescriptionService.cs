using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IPrescriptionService
{
    Task<PrescriptionDto> CreateAsync(
        CreatePrescriptionDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<PrescriptionDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<List<PrescriptionDto>> GetPrescriptionsAsync(
        int? encounterId,
        int? patientProfileId,
        int? doctorProfileId,
        CancellationToken cancellationToken);

    Task<PrescriptionDto> UpdateStatusAsync(
        int id,
        UpdatePrescriptionStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken);
}