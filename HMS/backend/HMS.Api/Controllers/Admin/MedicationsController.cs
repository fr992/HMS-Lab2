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
    private readonly IDataTransferService _dataTransferService;

    public MedicationsController(IMedicationsService medicationsService, IDataTransferService dataTransferService)
    {
        _medicationsService = medicationsService;
        _dataTransferService = dataTransferService;
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
    public async Task<ActionResult<PaginatedResponse<MedicationDto>>> GetAll(
        [FromQuery] bool? isActive,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var result = await _medicationsService.GetAllAsync(
            isActive,
            pagination,
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

    [HttpGet("export/{format}")]
    [RequirePermission("Medications.Read")]
    public async Task<IActionResult> Export(
        string format,
        [FromQuery] bool? isActive,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var export = await _dataTransferService.ExportAsync(
            "medications",
            format,
            new Dictionary<string, string?>
            {
                ["isActive"] = isActive?.ToString(),
                ["search"] = search
            },
            CurrentUserId() ?? 0,
            CurrentPermissions(),
            cancellationToken);

        return File(export.Content, export.ContentType, export.FileName);
    }

    [HttpPost("import/{format}")]
    [RequirePermission("Medications.Create")]
    public async Task<ActionResult<DataImportResultDto>> Import(
        string format,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        var result = await _dataTransferService.ImportAsync(
            "medications",
            format,
            file.FileName,
            stream,
            file.Length,
            CurrentUserId() ?? 0,
            cancellationToken);

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

    private IReadOnlyCollection<string> CurrentPermissions()
    {
        return User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToArray();
    }
}
