using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Lab;

[ApiController]
[Route("api/lab/results")]
public sealed class LabResultsWorkflowController : ControllerBase
{
    [HttpPost]
    [RequirePermission("LabResults.Create")]
    public IActionResult Create([FromBody] object? request)
    {
        return Ok(new { created = false, note = "Lab results module not implemented yet." });
    }

    [HttpPost("{id:int}/publish")]
    [RequirePermission("LabResults.Publish")]
    public IActionResult Publish(int id)
    {
        return Ok(new { id, published = false, note = "Lab results module not implemented yet." });
    }
}