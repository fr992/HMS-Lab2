using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

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

    private int? CurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(sub, out var id) ? id : null;
    }

[HttpPost("register")]
[RequirePermission("Patients.Register")]
public async Task<ActionResult<PatientProfileDto>> RegisterPatient(
    [FromBody] RegisterPatientRequestDto request,
    CancellationToken cancellationToken)
{
    try
    {
        var patient = await _patientService.RegisterAsync(request, CurrentUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new { error = ex.Message });
    }
}

    [HttpPost("{id:int}/portal")]
    [RequirePermission("Patients.Update")]
    public async Task<ActionResult<PatientProfileDto>> LinkPortalAccount(
        int id,
        [FromBody] LinkPatientPortalRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var patient = await _patientService.LinkPortalAccountAsync(
                id,
                request,
                CurrentUserId(),
                cancellationToken);
            return Ok(patient);
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
        PatientProfileDto? patient;

        try
        {
            patient = IsDoctorOnly()
                ? await _patientService.GetByIdForCurrentDoctorAsync(
                    CurrentUserId()
                        ?? throw new UnauthorizedException("User id claim is missing."),
                    id,
                    CurrentUserRoles(),
                    cancellationToken)
                : await _patientService.GetByIdAsync(id, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        if (patient is null)
            return NotFound();

        return Ok(patient);
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<PaginatedResponse<PatientProfileDto>>> GetAll(
    [FromQuery] PaginationQuery pagination,
    [FromQuery] string? gender,
    [FromQuery] bool? hasPortal,
    CancellationToken cancellationToken)
    {
        if (IsDoctorOnly())
            return Forbid();

        var patients = await _patientService.GetAllAsync(
            pagination,
            gender,
            hasPortal,
            cancellationToken);

        return Ok(patients);
    }

    private bool IsDoctorOnly()
    {
        return User.IsInRole("Doctor")
            && !User.IsInRole("Admin")
            && !User.IsInRole("SuperAdmin")
            && !User.IsInRole("Receptionist");
    }

    private IReadOnlyCollection<string> CurrentUserRoles()
    {
        return User.Claims
            .Where(c => c.Type == ClaimTypes.Role || c.Type == "role")
            .Select(c => c.Value)
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }


    [HttpPut("{id:int}")]
    [RequirePermission("Patients.Update")]
    public async Task<ActionResult<PatientProfileDto>> Update (int id, [FromBody] UpdatePatientRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var patient = await _patientService.UpdateAsync(id, request, CurrentUserId(), cancellationToken);
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
