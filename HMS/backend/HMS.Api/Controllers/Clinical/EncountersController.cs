using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters")]
public sealed class EncountersController : ControllerBase
{
    [HttpPost]
    [RequirePermission("Encounters.Create")]
    public IActionResult Start([FromBody] object? request)
    {
        return Ok(new { created = false, note = "Encounters module not implemented yet." });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Encounters.Read")]
    public IActionResult GetById(int id)
    {
        return Ok(new { id, found = false, note = "Encounters module not implemented yet." });
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Encounters.Update")]
    public IActionResult Update(int id, [FromBody] object? request)
    {
        return Ok(new { id, updated = false, note = "Encounters module not implemented yet." });
    }

    [HttpPost("{id:int}/close")]
    [RequirePermission("Encounters.Close")]
    public IActionResult Close(int id, [FromBody] object? request)
    {
        return Ok(new { id, closed = false, note = "Encounters module not implemented yet." });
    }
}