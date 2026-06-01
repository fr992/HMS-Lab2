using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/bed-assignment-requests")]
public sealed class EncounterBedAssignmentRequestsController : ControllerBase
{
    private readonly IBedAssignmentRequestService _service;

    public EncounterBedAssignmentRequestsController(IBedAssignmentRequestService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = "Doctor,Nurse,Admin,SuperAdmin")]
    public async Task<ActionResult<BedAssignmentRequestDto>> Create(
        int encounterId,
        [FromBody] CreateBedAssignmentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateForEncounterAsync(
            encounterId,
            request,
            CurrentUserId(),
            CurrentRoles(),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet]
    [RequirePermission("BedAssignmentRequests.Read")]
    public async Task<ActionResult<IReadOnlyList<BedAssignmentRequestDto>>> GetForEncounter(
        int encounterId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetForEncounterAsync(
            encounterId,
            CurrentUserId(),
            CurrentRoles(),
            cancellationToken);

        return Ok(result);
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid authenticated user.");

        return userId;
    }

    private IEnumerable<string> CurrentRoles()
    {
        return User.FindAll(ClaimTypes.Role).Select(claim => claim.Value);
    }
}
