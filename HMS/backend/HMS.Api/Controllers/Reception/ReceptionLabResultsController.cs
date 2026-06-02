using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/lab-results")]
public sealed class ReceptionLabResultsController : ControllerBase
{
    private readonly ILabResultService _labResultService;
    private readonly IWebHostEnvironment _environment;

    public ReceptionLabResultsController(
        ILabResultService labResultService,
        IWebHostEnvironment environment)
    {
        _labResultService = labResultService;
        _environment = environment;
    }

    [HttpGet("{id:int}")]
    [RequirePermission("LabResults.Read")]
    public async Task<ActionResult<LabResultDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _labResultService.GetByIdAsync(id, cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpGet]
    [RequirePermission("LabResults.Read")]
    public async Task<ActionResult<PaginatedResponse<LabResultDto>>> List(
        [FromQuery] int? patientId,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var result = await _labResultService.GetLabResultsAsync(
            patientId,
            pagination,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}/download")]
    [RequirePermission("LabResults.Read")]
    public async Task<IActionResult> Download(
        int id,
        CancellationToken cancellationToken)
    {
        var attachment = await _labResultService.GetAttachmentAsync(id, cancellationToken);

        if (attachment == null)
            return NotFound();

        var fullPath = ResolveAttachmentPath(attachment.StoragePath);
        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = "Attachment file was not found on disk." });

        return PhysicalFile(fullPath, attachment.ContentType, attachment.FileName);
    }

    private string ResolveAttachmentPath(string storedFileName)
    {
        var folder = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "App_Data", "LabResults"));
        var fullPath = Path.GetFullPath(Path.Combine(folder, storedFileName));
        var folderPrefix = folder.EndsWith(Path.DirectorySeparatorChar)
            ? folder
            : folder + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(folderPrefix, StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("Invalid attachment path.");

        return fullPath;
    }
}
