using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/patients")]
public sealed class PatientsController : ControllerBase
{

    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

[HttpPost("register")]
[RequirePermission("Patients.Register")]
public async Task<ActionResult<PatientProfileDto>> RegisterPatient(
    [FromBody] RegisterPatientRequestDto request,
    CancellationToken cancellationToken)
{
    try
    {
        var patient = await _patientService.RegisterAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new { error = ex.Message });
    }
}

    [HttpGet("{id:int}")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<PatientProfileDto>> GetById(
        int id, CancellationToken cancellationToken)
    {
        var patient = await _patientService.GetByIdAsync(id, cancellationToken);

        if (patient is null)
            return NotFound();

        return Ok(patient);
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<List<PatientProfileDto>>> GetAll(
    CancellationToken cancellationToken)
    {
        var patients = await _patientService.GetAllAsync(cancellationToken);

        return Ok(patients);
    }


    [HttpPut("{id:int}")]
    [RequirePermission("Patients.Update")]
    public async Task<ActionResult<PatientProfileDto>> Update (int id, [FromBody] UpdatePatientRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var patient = await _patientService.UpdateAsync(id, request, cancellationToken);
            return Ok(patient);
        }
        catch(InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [RequirePermission("Patients.Delete")]
    public async Task<IActionResult> DeletePatient(int id, CancellationToken cancellationToken) { 

        var deleted = await _patientService.DeleteAsync(id, cancellationToken);

        if(!deleted)
            return NotFound();

        return NoContent();
    }
}