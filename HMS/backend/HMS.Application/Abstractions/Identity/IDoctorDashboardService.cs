using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IDoctorDashboardService
{
    Task<DoctorDashboardDto> GetForCurrentDoctorAsync(
        int currentUserId,
        CancellationToken cancellationToken);
}
