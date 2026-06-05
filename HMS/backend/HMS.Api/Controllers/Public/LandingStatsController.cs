using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/landing-stats")]
public sealed class LandingStatsController : ControllerBase
{
    private readonly ILandingStatsService _landingStats;

    public LandingStatsController(ILandingStatsService landingStats)
    {
        _landingStats = landingStats;
    }

    [HttpGet]
    public async Task<ActionResult<LandingStatsDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _landingStats.GetAsync(cancellationToken));
    }
}
