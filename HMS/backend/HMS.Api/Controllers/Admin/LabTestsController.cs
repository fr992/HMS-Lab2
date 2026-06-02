using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/lab-tests")]
public sealed class LabTestsController : ControllerBase
{
    private readonly ILabTestService _labTestService;
    private readonly IDataTransferService _dataTransferService;

    public LabTestsController(ILabTestService labTestService, IDataTransferService dataTransferService)
    {
        _labTestService = labTestService;
        _dataTransferService = dataTransferService;
    }

    [HttpGet]
    [RequirePermission("LabTests.Read")]
    public async Task<ActionResult<PaginatedResponse<LabTestDto>>> List(
        [FromQuery] bool? isActive,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var result = await _labTestService.GetLabTestsAsync(isActive, pagination, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [RequirePermission("LabTests.Read")]
    public async Task<ActionResult<LabTestDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _labTestService.GetByIdAsync(id, cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpGet("export/{format}")]
    [RequirePermission("LabTests.Read")]
    public async Task<IActionResult> Export(
        string format,
        [FromQuery] bool? isActive,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var export = await _dataTransferService.ExportAsync(
            "lab-tests",
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
    [RequirePermission("LabTests.Create")]
    public async Task<ActionResult<DataImportResultDto>> Import(
        string format,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        var result = await _dataTransferService.ImportAsync(
            "lab-tests",
            format,
            file.FileName,
            stream,
            file.Length,
            CurrentUserId() ?? 0,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [RequirePermission("LabTests.Create")]
    public async Task<ActionResult<LabTestDto>> Create(
        [FromBody] CreateLabTestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labTestService.CreateAsync(
                request,
                CurrentUserId(),
                cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "A lab test with this name or code already exists." });
        }
    }

    [HttpPut("{id:int}")]
    [RequirePermission("LabTests.Update")]
    public async Task<ActionResult<LabTestDto>> Update(
        int id,
        [FromBody] UpdateLabTestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labTestService.UpdateAsync(
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
        catch (DbUpdateException)
        {
            return Conflict(new { error = "A lab test with this name or code already exists." });
        }
    }

    [HttpDelete("{id:int}")]
    [RequirePermission("LabTests.Delete")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            await _labTestService.DeleteAsync(
                id,
                CurrentUserId(),
                cancellationToken);

            return NoContent();
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

    private IReadOnlyCollection<string> CurrentPermissions()
    {
        return User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToArray();
    }
}
