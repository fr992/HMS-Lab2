using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/settings")]
public sealed class AdminSettingsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Settings.Manage")]
    public IActionResult GetSettings()
    {
        return Ok(new { entries = Array.Empty<object>(), note = "Settings store not wired yet." });
    }

    [HttpPut]
    [RequirePermission("Settings.Manage")]
    public IActionResult UpdateSettings([FromBody] object? body)
    {
        return Ok(new { saved = false, note = "Settings persistence not implemented yet." });
    }
}