using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/medications")]
public sealed class MedicationsController : ControllerBase
{
    private readonly IMedicationsService _medicationsService;

    public MedicationsController(IMedicationsService medicationsService)
    {
        _medicationsService = medicationsService;
    }

    [HttpPost]
    [RequirePermission("Medications.Create")]
    public async Task<ActionResult<MedicationDto>> Create(
        CreateMedicationDto request,
        CancellationToken cancellationToken)
    {
        var result = await _medicationsService.CreateAsync(
            request,
            CurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet]
    [RequirePermission("Medications.Read")]
    public async Task<ActionResult<List<MedicationDto>>> GetAll(
        [FromQuery] bool? isActive,
        CancellationToken cancellationToken)
    {
        var result = await _medicationsService.GetAllAsync(
            isActive,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Medications.Read")]
    public async Task<ActionResult<MedicationDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _medicationsService.GetByIdAsync(
            id,
            cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Medications.Update")]
    public async Task<ActionResult<MedicationDto>> Update(
        int id,
        UpdateMedicationDto request,
        CancellationToken cancellationToken)
    {
        var result = await _medicationsService.UpdateAsync(
            id,
            request,
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [RequirePermission("Medications.Delete")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        await _medicationsService.DeleteAsync(
            id,
            CurrentUserId(),
            cancellationToken);

        return NoContent();
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : null;
    }
}