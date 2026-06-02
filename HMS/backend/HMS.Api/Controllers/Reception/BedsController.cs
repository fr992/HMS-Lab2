using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/beds")]
public sealed class BedsController : ControllerBase
{
    private readonly IBedService _service;
    private readonly IDataTransferService _dataTransferService;

    public BedsController(IBedService service, IDataTransferService dataTransferService)
    {
        _service = service;
        _dataTransferService = dataTransferService;
    }

    [HttpGet]
    [RequirePermission("Beds.Read")]
    public async Task<ActionResult<IReadOnlyList<BedDto>>> GetBeds(
        [FromQuery] string? status,
        [FromQuery] int? departmentId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetBedsAsync(status, departmentId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("department")]
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<IReadOnlyList<BedPatientDetailsDto>>> GetDepartmentBeds(
        CancellationToken cancellationToken)
    {
        var result = await _service.GetBedsWithOccupancyByDepartmentAsync(CurrentUserId(), cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Beds.Read")]
    public async Task<ActionResult<BedDto>> GetBed(int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetBedAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("export/{format}")]
    [RequirePermission("Beds.Read")]
    public async Task<IActionResult> Export(
        string format,
        [FromQuery] string? status,
        [FromQuery] int? departmentId,
        CancellationToken cancellationToken)
    {
        var export = await _dataTransferService.ExportAsync(
            "beds",
            format,
            new Dictionary<string, string?>
            {
                ["status"] = status,
                ["departmentId"] = departmentId?.ToString()
            },
            CurrentUserId(),
            CurrentPermissions(),
            cancellationToken);

        return File(export.Content, export.ContentType, export.FileName);
    }

    [HttpPost("import/{format}")]
    [RequirePermission("Beds.Create")]
    public async Task<ActionResult<DataImportResultDto>> Import(
        string format,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        var result = await _dataTransferService.ImportAsync(
            "beds",
            format,
            file.FileName,
            stream,
            file.Length,
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [RequirePermission("Beds.Create")]
    public async Task<ActionResult<BedDto>> Create(
        [FromBody] CreateBedDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateBedAsync(request, CurrentUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetBed), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [RequirePermission("Beds.Update")]
    public async Task<ActionResult<BedDto>> Update(
        int id,
        [FromBody] UpdateBedDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateBedAsync(id, request, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{bedId:int}/assign")]
    [RequirePermission("Beds.Assign")]
    public async Task<ActionResult<BedAssignmentDto>> Assign(
        int bedId,
        [FromBody] AssignBedDto request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("Doctor"))
            throw new ForbiddenException("Doctors can request bed assignments but cannot assign beds directly.");

        var result = await _service.AssignAsync(bedId, request, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{bedId:int}/release")]
    [RequirePermission("Beds.Release")]
    public async Task<ActionResult<BedAssignmentDto>> ReleaseByBed(
        int bedId,
        [FromBody] ReleaseBedDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ReleaseByBedAsync(bedId, request, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("assignments/{assignmentId:int}/release")]
    [RequirePermission("Beds.Release")]
    public async Task<ActionResult<BedAssignmentDto>> ReleaseAssignment(
        int assignmentId,
        [FromBody] ReleaseBedDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ReleaseAssignmentAsync(assignmentId, request, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("assignments/active")]
    [RequirePermission("Beds.Read")]
    public async Task<ActionResult<IReadOnlyList<BedAssignmentDto>>> GetActiveAssignments(
        CancellationToken cancellationToken)
    {
        var result = await _service.GetActiveAssignmentsAsync(cancellationToken);
        return Ok(result);
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid authenticated user.");

        return userId;
    }

    private IReadOnlyCollection<string> CurrentPermissions()
    {
        return User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToArray();
    }
}
