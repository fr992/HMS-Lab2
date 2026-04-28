using HMS.Api.Authorization;
using HMS.Api.Security;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Receptionist;

[ApiController]
[Route("api/receptionist/appointments")]
[Authorize]
public sealed class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<List<AppointmentDto>>> GetAppointments(
        [FromQuery] DateTimeOffset? date,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();

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

    [HttpGet("{id:int}")]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<AppointmentDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _appointmentService.GetByIdAsync(id, cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPost]
    [RequirePermission("Appointments.Create")]
    public async Task<ActionResult<AppointmentDto>> Create(
        [FromBody] CreateAppointmentDto request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        try
        {
            var result = await _appointmentService.CreateAsync(
                request,
                userId,
                cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Appointments.Create")]
    public async Task<ActionResult<AppointmentDto>> Update(
        int id,
        [FromBody] UpdateAppointmentDto request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        try
        {
            var result = await _appointmentService.UpdateAsync(
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

    private string GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role")
            ?? "";
    }
}