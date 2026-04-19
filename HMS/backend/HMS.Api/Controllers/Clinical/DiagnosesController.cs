using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/diagnoses")]
public sealed class DiagnosesController : ControllerBase
{
    [HttpPost]
    [RequirePermission("Diagnoses.Manage")]
    public IActionResult Add(int encounterId, [FromBody] object? request)
    {
        return Ok(new { encounterId, created = false, note = "Diagnoses module not implemented yet." });
    }

    [HttpPut("{diagnosisId:int}")]
    [RequirePermission("Diagnoses.Manage")]
    public IActionResult Update(int encounterId, int diagnosisId, [FromBody] object? request)
    {
        return Ok(new { encounterId, diagnosisId, updated = false, note = "Diagnoses module not implemented yet." });
    }
}