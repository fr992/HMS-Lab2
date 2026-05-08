using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/lab-results")]
public sealed class MyLabResultsController : ControllerBase
{
    private readonly ILabResultService _labResultService;
    private readonly IWebHostEnvironment _environment;

    public MyLabResultsController(
        ILabResultService labResultService,
        IWebHostEnvironment environment)
    {
        _labResultService = labResultService;
        _environment = environment;
    }

    [HttpGet]
    [RequirePermission("Own.LabResults.View")]
    public async Task<ActionResult<List<LabResultDto>>> List(CancellationToken cancellationToken)
    {
        var result = await _labResultService.GetPublishedForPatientUserAsync(
            CurrentUserId(),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}/download")]
    [RequirePermission("Own.LabResults.Download")]
    public async Task<IActionResult> DownloadPdf(
        int id,
        CancellationToken cancellationToken)
    {
        var attachment = await _labResultService.GetPublishedAttachmentForPatientUserAsync(
            id,
            CurrentUserId(),
            cancellationToken);

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
            throw new InvalidOperationException("Invalid attachment path.");

        return fullPath;
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(value))
            throw new UnauthorizedAccessException("User id claim is missing.");

        return int.Parse(value);
    }
}
