using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/bed-assignment-requests")]
public sealed class BedAssignmentRequestsController : ControllerBase
{
    private readonly IBedAssignmentRequestService _service;

    public BedAssignmentRequestsController(IBedAssignmentRequestService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission("BedAssignmentRequests.Read")]
    public async Task<ActionResult<IReadOnlyList<BedAssignmentRequestDto>>> GetRequests(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetRequestsAsync(status, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{requestId:int}/assign")]
    [RequirePermission("BedAssignmentRequests.Assign")]
    public async Task<ActionResult<BedAssignmentRequestDto>> Assign(
        int requestId,
        [FromBody] AssignBedAssignmentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.AssignAsync(
            requestId,
            request,
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{requestId:int}/reject")]
    [RequirePermission("BedAssignmentRequests.Reject")]
    public async Task<ActionResult<BedAssignmentRequestDto>> Reject(
        int requestId,
        [FromBody] RejectBedAssignmentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.RejectAsync(
            requestId,
            request,
            CurrentUserId(),
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
}
