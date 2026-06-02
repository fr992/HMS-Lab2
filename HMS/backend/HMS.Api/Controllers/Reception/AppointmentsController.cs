using HMS.Api.Authorization;
using HMS.Api.Security;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
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
    private readonly IDataTransferService _dataTransferService;

    public AppointmentsController(IAppointmentService appointmentService, IDataTransferService dataTransferService)
    {
        _appointmentService = appointmentService;
        _dataTransferService = dataTransferService;
    }

    [HttpGet]
    [RequirePermission("Appointments.Read")]
    public async Task<ActionResult<PaginatedResponse<AppointmentDto>>> GetAppointments(
        [FromQuery] DateTimeOffset? date,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] string? status,
        [FromQuery] PaginationQuery pagination,
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
                status,
                pagination,
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
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

    [HttpGet("export/{format}")]
    [RequirePermission("Appointments.Read")]
    public async Task<IActionResult> Export(
        string format,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var export = await _dataTransferService.ExportAsync(
            "appointments",
            format,
            new Dictionary<string, string?> { ["status"] = status },
            GetCurrentUserId(),
            CurrentPermissions(),
            cancellationToken);

        return File(export.Content, export.ContentType, export.FileName);
    }

    [HttpPost("import/{format}")]
    [RequirePermission("Appointments.Create")]
    public async Task<ActionResult<DataImportResultDto>> Import(
        string format,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        var result = await _dataTransferService.ImportAsync(
            "appointments",
            format,
            file.FileName,
            stream,
            file.Length,
            GetCurrentUserId(),
            cancellationToken);

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
            throw new UnauthorizedException("User id claim is missing.");

        return int.Parse(value);
    }

    private IReadOnlyCollection<string> CurrentPermissions()
    {
        return User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToArray();
    }

}
