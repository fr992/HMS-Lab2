using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Lab;

[ApiController]
[Route("api/lab/requests")]
public sealed class LabRequestsWorkflowController : ControllerBase
{
    private readonly ILabRequestService _labRequestService;

    public LabRequestsWorkflowController(ILabRequestService labRequestService)
    {
        _labRequestService = labRequestService;
    }

    [HttpGet]
    [RequirePermission("LabRequests.Read")]
    public async Task<ActionResult<PaginatedResponse<LabRequestDto>>> List(
        [FromQuery] string? status,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labRequestService.GetLabRequestsAsync(
                status,
                pagination,
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("LabRequests.UpdateStatus")]
    public async Task<ActionResult<LabRequestDto>> UpdateStatus(
        int id,
        [FromBody] UpdateLabRequestStatusDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labRequestService.UpdateStatusAsync(
                id,
                request,
                CurrentUserId(),
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return int.TryParse(value, out var id) ? id : null;
    }
}
