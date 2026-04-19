using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/lab-results")]
public sealed class ReceptionLabResultsController : ControllerBase
{
    [HttpGet("{id:int}")]
    [RequirePermission("LabResults.Read")]
    public IActionResult GetById(int id)
    {
        return Ok(new { id, found = false, note = "Lab results module not implemented yet." });
    }

    [HttpGet]
    [RequirePermission("LabResults.Read")]
    public IActionResult List([FromQuery] int? patientId)
    {
        return Ok(Array.Empty<object>());
    }
}