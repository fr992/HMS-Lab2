using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/appointment-requests")]
[Authorize]
public sealed class AppointmentRequestsController : ControllerBase
{
    private readonly IAppointmentRequestService _appointmentRequestService;

    public AppointmentRequestsController(IAppointmentRequestService appointmentRequestService)
    {
        _appointmentRequestService = appointmentRequestService;
    }

    [HttpGet]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<PaginatedResponse<AppointmentRequestDto>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] DateOnly? preferredDate,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        try
        {
            var list = await _appointmentRequestService.GetAllAsync(
                status,
                preferredDate,
                pagination,
                cancellationToken);

            return Ok(list);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<AppointmentRequestDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var item = await _appointmentRequestService.GetByIdAsync(id, cancellationToken);

        if (item == null)
            return NotFound();

        return Ok(item);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<AppointmentRequestDto>> Create(
        [FromBody] CreateAppointmentRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _appointmentRequestService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("Appointments.ManageStatus")]
    public async Task<ActionResult<AppointmentRequestDto>> UpdateStatus(
        int id,
        [FromBody] UpdateAppointmentRequestStatusDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _appointmentRequestService.UpdateStatusAsync(
                id,
                request,
                CurrentUserId(),
                cancellationToken);

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return int.TryParse(value, out var id) ? id : null;
    }
}
