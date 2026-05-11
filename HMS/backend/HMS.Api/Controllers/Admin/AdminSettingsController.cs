using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/settings")]
public sealed class AdminSettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public AdminSettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    [RequirePermission("Settings.Manage")]
    public async Task<ActionResult<PaginatedResponse<SettingDto>>> GetSettings(
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.GetAllAsync(pagination, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Settings.Manage")]
    public async Task<ActionResult<SettingDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.GetByIdAsync(id, cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPost]
    [RequirePermission("Settings.Manage")]
    public async Task<ActionResult<SettingDto>> Create(
        CreateSettingDto request,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Settings.Manage")]
    public async Task<ActionResult<SettingDto>> Update(
        int id,
        UpdateSettingDto request,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.UpdateAsync(id, request, cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [RequirePermission("Settings.Manage")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        await _settingsService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
