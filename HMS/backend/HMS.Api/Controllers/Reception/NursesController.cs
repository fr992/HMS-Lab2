using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/nurses")]
[Authorize]
public sealed class NursesController : ControllerBase
{
    private readonly IStaffDirectoryService _staffDirectory;

    public NursesController(IStaffDirectoryService staffDirectory)
    {
        _staffDirectory = staffDirectory;
    }

    [HttpGet]
    [RequirePermission("Nurses.Read")]
    public async Task<ActionResult<List<NurseProfileDto>>> GetNurses(CancellationToken cancellationToken)
    {
        return Ok(await _staffDirectory.GetNursesAsync(cancellationToken));
    }
}
