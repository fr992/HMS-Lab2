using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ILandingStatsService
{
    Task<LandingStatsDto> GetAsync(CancellationToken cancellationToken);
}
