using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/doctors")]
public sealed class PublicDoctorsController : ControllerBase
{
    private readonly IStaffDirectoryService _staffDirectory;

    public PublicDoctorsController(IStaffDirectoryService staffDirectory)
    {
        _staffDirectory = staffDirectory;
    }

    [HttpGet]
    public async Task<ActionResult<List<DoctorProfileDto>>> GetDoctors(
        CancellationToken cancellationToken,
        [FromQuery] string? search = null,
        [FromQuery] int? limit = null)
    {
        return Ok(await _staffDirectory.GetDoctorsAsync(search, limit, cancellationToken));
    }
}
