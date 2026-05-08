using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/clinical/doctor/patients")]
[Authorize]
public sealed class DoctorPatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public DoctorPatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<List<PatientProfileDto>>> GetDoctorPatients(
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        try
        {
            var patients = await _patientService.GetForCurrentDoctorAsync(
                userId,
                cancellationToken);

            return Ok(patients);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("grouped")]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<DoctorPatientsGroupedDto>> GetDoctorPatientsGrouped(
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        try
        {
            var patients = await _patientService.GetGroupedForCurrentDoctorAsync(
                userId,
                cancellationToken);

            return Ok(patients);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private int GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(value))
            throw new UnauthorizedException("User id claim is missing.");

        return int.Parse(value);
    }
}
