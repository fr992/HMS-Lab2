using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/appointment-requests")]
public sealed class AppointmentRequestsController : ControllerBase
{
    private readonly IAppointmentRequestService _appointmentRequestService;

    public AppointmentRequestsController(IAppointmentRequestService appointmentRequestService)
    {
        _appointmentRequestService = appointmentRequestService;
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
            return CreatedAtAction(nameof(Create), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
