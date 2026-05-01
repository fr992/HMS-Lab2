using HMS.Api.Authorization;
using HMS.Api.Security;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Patients;

[ApiController]
[Route("api/patients/me/appointments")]
[Authorize]
public sealed class MyAppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public MyAppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet]
    [RequirePermission("Own.Appointments.View")]
    public async Task<ActionResult<List<AppointmentDto>>> GetMyAppointments(
        [FromQuery] DateTimeOffset? date,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        var permissions = User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToList();

        try
        {
            var result = await _appointmentService.GetAppointmentsAsync(
                userId,
                permissions,
                date,
                from,
                to,
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
