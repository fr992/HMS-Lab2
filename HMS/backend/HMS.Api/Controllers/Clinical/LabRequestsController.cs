using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/lab-requests")]
public sealed class EncounterLabRequestsController : ControllerBase
{
    [HttpPost]
    [RequirePermission("LabRequests.Create")]
    public IActionResult CreateFromEncounter(int encounterId, [FromBody] object? request)
    {
        return Ok(new { encounterId, created = false, note = "Lab requests module not implemented yet." });
    }
}