using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/diagnoses")]
public sealed class DiagnosesController : ControllerBase
{
    private readonly IDiagnosisService _diagnosisService;

    public DiagnosesController(IDiagnosisService diagnosisService)
    {
        _diagnosisService = diagnosisService;
    }

    [HttpGet]
    [RequirePermission("Encounters.Read")]
    public async Task<ActionResult<List<DiagnosisDto>>> GetAll(
        int encounterId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _diagnosisService.GetByEncounterAsync(
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
    [RequirePermission("Diagnoses.Manage")]
    public async Task<ActionResult<DiagnosisDto>> Create(
        int encounterId,
        [FromBody] CreateDiagnosisDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _diagnosisService.CreateAsync(
                encounterId,
                request,
                CurrentUserId(),
                cancellationToken);

            return CreatedAtAction(nameof(GetAll), new { encounterId }, result);
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
