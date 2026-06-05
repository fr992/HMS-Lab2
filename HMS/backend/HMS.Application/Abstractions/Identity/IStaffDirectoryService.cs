using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IStaffDirectoryService
{
    Task<IReadOnlyList<DoctorProfileDto>> GetDoctorsAsync(
        string? search,
        int? limit,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<NurseProfileDto>> GetNursesAsync(
        CancellationToken cancellationToken);
}
