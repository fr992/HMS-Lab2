using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters")]
public sealed class EncountersController : ControllerBase
{
    private readonly IEncounterService _encounterService;

    public EncountersController(IEncounterService encounterService)
    {
        _encounterService = encounterService;
    }

    [HttpPost]
    [RequirePermission("Encounters.Create")]
    public async Task<ActionResult<EncounterDto>> Create(
        CreateEncounterDto request,
        CancellationToken cancellationToken)
    {
        var result = await _encounterService.CreateAsync(
            request,
            CurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Encounters.Read")]
    public async Task<ActionResult<EncounterDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _encounterService.GetByIdAsync(id, cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpGet]
    [RequirePermission("Encounters.Read")]
    public async Task<ActionResult<List<EncounterDto>>> GetAll(
        [FromQuery] int? patientProfileId,
        [FromQuery] int? doctorProfileId,
        CancellationToken cancellationToken)
    {
        var result = await _encounterService.GetEncountersAsync(
            patientProfileId,
            doctorProfileId,
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Encounters.Update")]
    public async Task<ActionResult<EncounterDto>> Update(
        int id,
        UpdateEncounterDto request,
        CancellationToken cancellationToken)
    {
        var result = await _encounterService.UpdateAsync(
            id,
            request,
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("Encounters.Update")]
    public async Task<ActionResult<EncounterDto>> UpdateStatus(
        int id,
        UpdateEncounterStatusDto request,
        CancellationToken cancellationToken)
    {
        var result = await _encounterService.UpdateStatusAsync(
            id,
            request,
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/close")]
    [RequirePermission("Encounters.Close")]
    public async Task<ActionResult<EncounterDto>> Close(
    int id,
    CancellationToken cancellationToken)
    {
        var result = await _encounterService.UpdateStatusAsync(
            id,
            new UpdateEncounterStatusDto
            {
                Status = EncounterStatus.Completed
            },
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : null;
    }
}