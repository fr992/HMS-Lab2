using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/encounters/{encounterId:int}/prescriptions")]
public sealed class PrescriptionsController : ControllerBase
{
    [HttpPost]
    [RequirePermission("Prescriptions.Manage")]
    public IActionResult Create(int encounterId, [FromBody] object? request)
    {
        return Ok(new { encounterId, created = false, note = "Prescriptions module not implemented yet." });
    }

    [HttpPut("{prescriptionId:int}")]
    [RequirePermission("Prescriptions.Manage")]
    public IActionResult Update(int encounterId, int prescriptionId, [FromBody] object? request)
    {
        return Ok(new { encounterId, prescriptionId, updated = false, note = "Prescriptions module not implemented yet." });
    }
}