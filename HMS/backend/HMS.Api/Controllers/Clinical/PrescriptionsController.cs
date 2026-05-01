using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/prescriptions")]
public sealed class PrescriptionsController : ControllerBase
{
    private readonly IPrescriptionService _prescriptionService;

    public PrescriptionsController(IPrescriptionService prescriptionService)
    {
        _prescriptionService = prescriptionService;
    }

    [HttpPost]
    [RequirePermission("Prescriptions.Create")]
    public async Task<ActionResult<PrescriptionDto>> Create(
        int encounterId,
        CreatePrescriptionDto request,
        CancellationToken cancellationToken)
    {
        request.EncounterId = encounterId;

        var result = await _prescriptionService.CreateAsync(
            request,
            CurrentUserId(),
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { encounterId, prescriptionId = result.Id },
            result);
    }

    [HttpGet]
    [RequirePermission("Prescriptions.Read")]
    public async Task<ActionResult<List<PrescriptionDto>>> GetByEncounter(
       int encounterId,
       CancellationToken cancellationToken)
    {
        var result = await _prescriptionService.GetPrescriptionsAsync(
            encounterId,
            patientProfileId: null,
            doctorProfileId: null,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{prescriptionId:int}")]
    [RequirePermission("Prescriptions.Read")]
    public async Task<ActionResult<PrescriptionDto>> GetById(
        int encounterId,
        int prescriptionId,
        CancellationToken cancellationToken)
    {
        var result = await _prescriptionService.GetByIdAsync(
            prescriptionId,
            cancellationToken);

        if (result == null || result.EncounterId != encounterId)
            return NotFound();

        return Ok(result);
    }

    [HttpPatch("{prescriptionId:int}/status")]
    [RequirePermission("Prescriptions.Update")]
    public async Task<ActionResult<PrescriptionDto>> UpdateStatus(
        int encounterId,
        int prescriptionId,
        UpdatePrescriptionStatusDto request,
        CancellationToken cancellationToken)
    {
        var existing = await _prescriptionService.GetByIdAsync(
            prescriptionId,
            cancellationToken);

        if (existing == null || existing.EncounterId != encounterId)
            return NotFound();

        var result = await _prescriptionService.UpdateStatusAsync(
            prescriptionId,
            request,
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