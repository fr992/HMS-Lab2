using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IPatientContactService
{
    Task<IReadOnlyList<PatientContactDto>?> GetByPatientIdAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default);

    Task UpdateContactsAsync(
        int patientProfileId,
        IReadOnlyList<PatientContactDto> contacts,
        CancellationToken cancellationToken = default);
}
