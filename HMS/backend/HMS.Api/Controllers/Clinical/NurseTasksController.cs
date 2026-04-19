using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/nurse-tasks")]
public sealed class NurseTasksController : ControllerBase
{
    [HttpPost]
    [RequirePermission("NurseTasks.Assign")]
    public IActionResult Assign([FromBody] object? request)
    {
        return Ok(new { assigned = false, note = "Nurse tasks module not implemented yet." });
    }

    [HttpGet("my")]
    [RequirePermission("NurseTasks.Read")]
    public IActionResult MyTasks()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpGet]
    [RequirePermission("NurseTasks.Read")]
    public IActionResult List([FromQuery] int? encounterId)
    {
        return Ok(Array.Empty<object>());
    }

    [HttpPost("{id:int}/complete")]
    [RequirePermission("NurseTasks.Complete")]
    public IActionResult Complete(int id, [FromBody] object? request)
    {
        return Ok(new { id, completed = false, note = "Nurse tasks module not implemented yet." });
    }
}