using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IStaffProfileService
{
    Task<(DoctorProfileDto? doctor, string? error)> CreateDoctorAsync(
        CreateDoctorStaffRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default);

    Task<(NurseProfileDto? nurse, string? error)> CreateNurseAsync(
        CreateNurseStaffRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default);

    Task<(StaffProfileDto? staff, string? error)> CreateGeneralStaffAsync(
        CreateGeneralStaffRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default);
}
