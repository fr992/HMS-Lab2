using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Lab;

[ApiController]
[Route("api/lab/requests")]
public sealed class LabRequestsWorkflowController : ControllerBase
{
    [HttpGet]
    [RequirePermission("LabRequests.Read")]
    public IActionResult List([FromQuery] string? status)
    {
        return Ok(Array.Empty<object>());
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("LabRequests.UpdateStatus")]
    public IActionResult UpdateStatus(int id, [FromBody] object? request)
    {
        return Ok(new { id, updated = false, note = "Lab requests workflow not implemented yet." });
    }
}