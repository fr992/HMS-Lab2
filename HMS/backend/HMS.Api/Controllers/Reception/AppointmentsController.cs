using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/appointments")]
public sealed class AppointmentsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Appointments.Read")]
    public IActionResult List([FromQuery] DateTimeOffset? date, [FromQuery] int? doctorUserId)
    {
        return Ok(Array.Empty<object>());
    }

    [HttpPost]
    [RequirePermission("Appointments.Create")]
    public IActionResult Create([FromBody] object? request)
    {
        return Ok(new { created = false, note = "Appointments module not implemented yet." });
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("Appointments.ManageStatus")]
    public IActionResult ChangeStatus(int id, [FromBody] object? request)
    {
        return Ok(new { id, updated = false, note = "Appointments module not implemented yet." });
    }
}