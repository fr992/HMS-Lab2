using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/doctors")]
[Authorize]
public sealed class DoctorsController : ControllerBase
{
    private readonly IStaffDirectoryService _staffDirectory;

    public DoctorsController(IStaffDirectoryService staffDirectory)
    {
        _staffDirectory = staffDirectory;
    }

    /// <summary>
    /// Active doctor users for dropdowns (patient primary doctor, appointments, etc.).
    /// </summary>
    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<List<DoctorProfileDto>>> GetDoctors(
        CancellationToken cancellationToken,
        [FromQuery] string? search = null,
        [FromQuery] int? limit = null)
    {
        return Ok(await _staffDirectory.GetDoctorsAsync(search, limit, cancellationToken));
    }
}
