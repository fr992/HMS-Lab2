using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/patients/{patientId:int}/contacts")]
public sealed class PatientContactsController : ControllerBase
{
    private readonly IPatientContactService _contacts;

    public PatientContactsController(IPatientContactService contacts)
    {
        _contacts = contacts;
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<IReadOnlyList<PatientContactDto>>> GetByPatientId(
        int patientId,
        CancellationToken cancellationToken)
    {
        var list = await _contacts.GetByPatientIdAsync(patientId, cancellationToken);
        if (list is null)
            return NotFound();
        return Ok(list);
    }

    [HttpPut]
    [RequirePermission("Patients.Update")]
    public async Task<IActionResult> Update(
        int patientId,
        [FromBody] List<PatientContactDto> contacts,
        CancellationToken cancellationToken)
    {
        if (contacts is null)
            return BadRequest();
        try
        {
            await _contacts.UpdateContactsAsync(patientId, contacts, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return ex.Message == "Patient not found." ? NotFound() : BadRequest(new { error = ex.Message });
        }

        return NoContent();
    }
}
