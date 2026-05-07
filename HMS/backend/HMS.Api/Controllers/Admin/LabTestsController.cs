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

    public LabTestsController(ILabTestService labTestService)
    {
        _labTestService = labTestService;
    }

    [HttpGet]
    [RequirePermission("LabTests.Read")]
    public async Task<ActionResult<List<LabTestDto>>> List(
        [FromQuery] bool? isActive,
        CancellationToken cancellationToken)
    {
        var result = await _labTestService.GetLabTestsAsync(isActive, cancellationToken);

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
}
