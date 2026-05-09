using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/staff")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminStaffController : ControllerBase
{
    private readonly IStaffProfileService _staffProfiles;

    public AdminStaffController(IStaffProfileService staffProfiles)
    {
        _staffProfiles = staffProfiles;
    }

    private int? CurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(sub, out var id) ? id : null;
    }

    [HttpPost("doctors")]
    [RequirePermission("Users.Create")]
    [ProducesResponseType(typeof(DoctorProfileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DoctorProfileDto>> CreateDoctor(
        [FromBody] CreateDoctorStaffRequestDto request,
        CancellationToken cancellationToken)
    {
        var (doctor, error) = await _staffProfiles.CreateDoctorAsync(
            request,
            CurrentUserId(),
            cancellationToken);

        if (error is not null)
            return BadRequest(new { error });

        return Created($"/api/doctors/{doctor!.Id}", doctor);
    }

    [HttpPost("nurses")]
    [RequirePermission("Users.Create")]
    [ProducesResponseType(typeof(NurseProfileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NurseProfileDto>> CreateNurse(
        [FromBody] CreateNurseStaffRequestDto request,
        CancellationToken cancellationToken)
    {
        var (nurse, error) = await _staffProfiles.CreateNurseAsync(
            request,
            CurrentUserId(),
            cancellationToken);

        if (error is not null)
            return BadRequest(new { error });

        return Created($"/api/nurses/{nurse!.Id}", nurse);
    }
}
