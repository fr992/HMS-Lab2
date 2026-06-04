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
    private readonly IDataTransferService _dataTransferService;

    public PatientsController(IPatientService patientService, IDataTransferService dataTransferService)
    {
        _patientService = patientService;
        _dataTransferService = dataTransferService;
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
    var patient = await _patientService.RegisterAsync(request, CurrentUserId(), cancellationToken);
    return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
}

    [HttpPost("{id:int}/portal")]
    [RequirePermission("Patients.Update")]
    public async Task<ActionResult<PatientProfileDto>> LinkPortalAccount(
        int id,
        [FromBody] LinkPatientPortalRequestDto request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientService.LinkPortalAccountAsync(
            id,
            request,
            CurrentUserId(),
            cancellationToken);
        return Ok(patient);
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

    [HttpGet("export/{format}")]
    [RequirePermission("Patients.Read")]
    public async Task<IActionResult> Export(
        string format,
        [FromQuery] string? search,
        [FromQuery] string? gender,
        [FromQuery] bool? hasPortal,
        CancellationToken cancellationToken)
    {
        if (IsDoctorOnly())
            return Forbid();

        var export = await _dataTransferService.ExportAsync(
            "patients",
            format,
            new Dictionary<string, string?>
            {
                ["search"] = search,
                ["gender"] = gender,
                ["hasPortal"] = hasPortal?.ToString()
            },
            CurrentUserId() ?? 0,
            CurrentPermissions(),
            cancellationToken);

        return File(export.Content, export.ContentType, export.FileName);
    }

    [HttpPost("import/{format}")]
    [RequirePermission("Patients.Register")]
    public async Task<ActionResult<DataImportResultDto>> Import(
        string format,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        var result = await _dataTransferService.ImportAsync(
            "patients",
            format,
            file.FileName,
            stream,
            file.Length,
            CurrentUserId() ?? 0,
            cancellationToken);

        return Ok(result);
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

    private IReadOnlyCollection<string> CurrentPermissions()
    {
        return User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToArray();
    }


    [HttpPut("{id:int}")]
    [RequirePermission("Patients.Update")]
    public async Task<ActionResult<PatientProfileDto>> Update (int id, [FromBody] UpdatePatientRequestDto request, CancellationToken cancellationToken)
    {
        var patient = await _patientService.UpdateAsync(id, request, CurrentUserId(), cancellationToken);
        return Ok(patient);
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
