using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/patients")]
public sealed class PatientsController : ControllerBase
{
    [HttpPost("register")]
    [RequirePermission("Patients.Register")]
    public IActionResult RegisterPatient([FromBody] object? request)
    {
        return Ok(new { created = false, note = "Patient module not implemented yet." });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Patients.Read")]
    public IActionResult GetById(int id)
    {
        return Ok(new { id, found = false, note = "Patient module not implemented yet." });
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public IActionResult Search([FromQuery] string? q)
    {
        return Ok(Array.Empty<object>());
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Patients.Update")]
    public IActionResult Update(int id, [FromBody] object? request)
    {
        return Ok(new { id, updated = false, note = "Patient module not implemented yet." });
    }
}