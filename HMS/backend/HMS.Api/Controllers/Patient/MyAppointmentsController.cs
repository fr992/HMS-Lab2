using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/appointments")]
public sealed class MyAppointmentsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Own.Appointments.View")]
    public IActionResult Mine()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpPost("request")]
    [RequirePermission("Own.Appointments.Request")]
    public IActionResult RequestAppointment([FromBody] object? request)
    {
        return Ok(new { requested = false, note = "Patient portal appointments not implemented yet." });
    }
}