using HMS.Api.Authorization;
using HMS.Api.Security;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/clinical/doctor/appointments")]
[Authorize]
public sealed class DoctorAppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public DoctorAppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<List<AppointmentDto>>> GetDoctorAppointments(
        [FromQuery] DateTimeOffset? date,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        var permissions = User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToList();

        var result = await _appointmentService.GetAppointmentsAsync(
            userId,
            permissions, 
            date,
            cancellationToken);

        return Ok(result);
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("Appointments.ManageStatus")]
    public async Task<ActionResult<AppointmentDto>> UpdateStatus(
        int id,
        [FromBody] UpdateAppointmentStatusDto request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        try
        {
            var result = await _appointmentService.UpdateStatusAsync(
                id,
                request,
                userId,
                cancellationToken);

            return Ok(result);
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
            throw new UnauthorizedAccessException("User id claim is missing.");

        return int.Parse(value);
    }
}