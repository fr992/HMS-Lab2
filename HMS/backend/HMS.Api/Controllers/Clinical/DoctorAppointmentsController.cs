using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/doctor/appointments")]
public sealed class DoctorAppointmentsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Appointments.Read")]
    public IActionResult MyAppointments([FromQuery] DateTimeOffset? day)
    {
        return Ok(Array.Empty<object>());
    }
}