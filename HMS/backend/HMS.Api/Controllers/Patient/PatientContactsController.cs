using Microsoft.AspNetCore.Mvc;
using HMS.Contracts.Identity;

namespace Identity.Infrastructure.Services;


[ApiController]
[Route("api/patients/{patientId}/contacts")]
public class PatientContactsController : ControllerBase
{
    private readonly PatientContactService _service;

    public PatientContactsController(PatientContactService service)
    {
        _service = service;
    }

    [HttpPut]
    public async Task<IActionResult> Update(int patientId, List<PatientContactDto> contacts)
    {
        await _service.UpdateContactsAsync(patientId, contacts);
        return NoContent();
    }
}