using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Lab;

[ApiController]
[Route("api/lab/results")]
public sealed class LabResultsWorkflowController : ControllerBase
{
    private static readonly HashSet<string> AllowedAttachmentContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private const long MaxAttachmentBytes = 10 * 1024 * 1024;
    private readonly ILabResultService _labResultService;
    private readonly IWebHostEnvironment _environment;

    public LabResultsWorkflowController(
        ILabResultService labResultService,
        IWebHostEnvironment environment)
    {
        _labResultService = labResultService;
        _environment = environment;
    }

    [HttpPost]
    [RequestSizeLimit(MaxAttachmentBytes + 1024 * 1024)]
    [RequirePermission("LabResults.Create")]
    public async Task<ActionResult<LabResultDto>> Create(
        [FromForm] LabResultFormRequest request,
        CancellationToken cancellationToken)
    {
        string? storedFileName = null;

        try
        {
            if (request.Attachment is { Length: > 0 })
                storedFileName = await SaveAttachmentAsync(request.Attachment, cancellationToken);

            var result = await _labResultService.CreateAsync(
                new CreateLabResultDto
                {
                    LabRequestItemId = request.LabRequestItemId,
                    ResultData = request.ResultData,
                    ReferenceRange = request.ReferenceRange,
                    Interpretation = request.Interpretation,
                    FileOriginalName = request.Attachment?.FileName,
                    FileStoredName = storedFileName,
                    FileContentType = request.Attachment?.ContentType,
                    FileSizeBytes = request.Attachment?.Length,
                    FileStoragePath = storedFileName
                },
                CurrentUserId(),
                cancellationToken);

            return CreatedAtAction(
                nameof(HMS.Api.Controllers.Reception.ReceptionLabResultsController.GetById),
                "ReceptionLabResults",
                new { id = result.Id },
                result);
        }
        catch (Exception)
        {
            DeleteAttachmentIfPresent(storedFileName);
            throw;
        }
    }

    [HttpPut("{id:int}")]
    [RequestSizeLimit(MaxAttachmentBytes + 1024 * 1024)]
    [RequirePermission("LabResults.Update")]
    public async Task<ActionResult<LabResultDto>> Update(
        int id,
        [FromForm] LabResultUpdateFormRequest request,
        CancellationToken cancellationToken)
    {
        string? storedFileName = null;
        var previousAttachment = await _labResultService.GetAttachmentAsync(id, cancellationToken);

        try
        {
            if (request.Attachment is { Length: > 0 })
                storedFileName = await SaveAttachmentAsync(request.Attachment, cancellationToken);

            var result = await _labResultService.UpdateAsync(
                id,
                new UpdateLabResultDto
                {
                    ResultData = request.ResultData,
                    ReferenceRange = request.ReferenceRange,
                    Interpretation = request.Interpretation,
                    RemoveAttachment = request.RemoveAttachment,
                    FileOriginalName = request.Attachment?.FileName,
                    FileStoredName = storedFileName,
                    FileContentType = request.Attachment?.ContentType,
                    FileSizeBytes = request.Attachment?.Length,
                    FileStoragePath = storedFileName
                },
                CurrentUserId(),
                cancellationToken);

            if ((storedFileName is not null || request.RemoveAttachment) && previousAttachment is not null)
                DeleteAttachmentIfPresent(previousAttachment.StoragePath);

            return Ok(result);
        }
        catch (Exception)
        {
            DeleteAttachmentIfPresent(storedFileName);
            throw;
        }
    }

    [HttpPost("{id:int}/publish")]
    [RequirePermission("LabResults.Publish")]
    public async Task<ActionResult<LabResultDto>> Publish(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _labResultService.PublishAsync(
                id,
                CurrentUserId(),
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private async Task<string> SaveAttachmentAsync(
        IFormFile attachment,
        CancellationToken cancellationToken)
    {
        if (attachment.Length > MaxAttachmentBytes)
            throw new BadRequestException("Attachment cannot be larger than 10 MB.");

        if (!AllowedAttachmentContentTypes.Contains(attachment.ContentType))
            throw new BadRequestException("Attachment must be a PDF or image file.");

        var extension = Path.GetExtension(attachment.FileName);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var folder = AttachmentFolder();
        Directory.CreateDirectory(folder);

        var fullPath = Path.Combine(folder, storedFileName);

        await using var stream = System.IO.File.Create(fullPath);
        await attachment.CopyToAsync(stream, cancellationToken);

        return storedFileName;
    }

    private void DeleteAttachmentIfPresent(string? storedFileName)
    {
        if (string.IsNullOrWhiteSpace(storedFileName))
            return;

        var fullPath = Path.Combine(AttachmentFolder(), storedFileName);
        if (System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);
    }

    private string AttachmentFolder()
    {
        return Path.Combine(_environment.ContentRootPath, "App_Data", "LabResults");
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return int.TryParse(value, out var id) ? id : null;
    }
}

public sealed class LabResultFormRequest
{
    public int LabRequestItemId { get; set; }
    public string ResultData { get; set; } = string.Empty;
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
    public IFormFile? Attachment { get; set; }
}

public sealed class LabResultUpdateFormRequest
{
    public string ResultData { get; set; } = string.Empty;
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
    public bool RemoveAttachment { get; set; }
    public IFormFile? Attachment { get; set; }
}
