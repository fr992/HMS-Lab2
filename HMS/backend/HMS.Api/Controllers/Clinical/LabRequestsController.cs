using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/lab-requests")]
public sealed class EncounterLabRequestsController : ControllerBase
{
    private readonly ILabRequestService _labRequestService;

    public EncounterLabRequestsController(ILabRequestService labRequestService)
    {
        _labRequestService = labRequestService;
    }

    [HttpGet]
    [RequirePermission("Encounters.Read")]
    public async Task<ActionResult<List<LabRequestDto>>> GetByEncounter(
        int encounterId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labRequestService.GetByEncounterAsync(
                encounterId,
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    [RequirePermission("LabRequests.Create")]
    public async Task<ActionResult<LabRequestDto>> CreateFromEncounter(
        int encounterId,
        [FromBody] CreateLabRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labRequestService.CreateAsync(
                encounterId,
                request,
                CurrentUserId(),
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { encounterId, labRequestId = result.Id },
                result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{labRequestId:int}")]
    [RequirePermission("Encounters.Read")]
    public async Task<ActionResult<LabRequestDto>> GetById(
        int encounterId,
        int labRequestId,
        CancellationToken cancellationToken)
    {
        var result = await _labRequestService.GetByIdAsync(
            labRequestId,
            cancellationToken);

        if (result == null || result.EncounterId != encounterId)
            return NotFound();

        return Ok(result);
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return int.TryParse(value, out var id) ? id : null;
    }
}
