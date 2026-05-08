using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Identity.Infrastructure.Services;

public sealed class LabResultService : ILabResultService
{
    private readonly HmsDbContext _db;

    public LabResultService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<LabResultDto> CreateAsync(
        CreateLabResultDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new InvalidOperationException("Authenticated user is required.");

        if (request == null)
            throw new InvalidOperationException("Lab result payload is required.");

        if (request.LabRequestItemId <= 0)
            throw new InvalidOperationException("Lab request item is required.");

        if (string.IsNullOrWhiteSpace(request.ResultData))
            throw new InvalidOperationException("Result data is required.");

        var item = await _db.LabRequestItems
            .Include(i => i.LabRequest)
            .FirstOrDefaultAsync(i => i.Id == request.LabRequestItemId, cancellationToken);

        if (item == null)
            throw new InvalidOperationException("Lab request item not found.");

        if (item.LabRequest.Status == LabRequestStatus.Cancelled)
            throw new InvalidOperationException("Cannot add results to a cancelled lab request.");

        var now = DateTime.UtcNow;
        HmsFile? file = null;

        if (!string.IsNullOrWhiteSpace(request.FileStoragePath))
        {
            if (string.IsNullOrWhiteSpace(request.FileOriginalName) ||
                string.IsNullOrWhiteSpace(request.FileStoredName) ||
                string.IsNullOrWhiteSpace(request.FileContentType) ||
                request.FileSizeBytes == null)
            {
                throw new InvalidOperationException("Complete file metadata is required when attaching a file.");
            }

            file = new HmsFile
            {
                OriginalFileName = request.FileOriginalName.Trim(),
                StoredFileName = request.FileStoredName.Trim(),
                ContentType = request.FileContentType.Trim(),
                SizeBytes = request.FileSizeBytes.Value,
                StoragePath = request.FileStoragePath.Trim(),
                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            };
        }

        var labResult = new LabResult
        {
            LabRequestItemId = request.LabRequestItemId,
            ResultData = request.ResultData.Trim(),
            ReferenceRange = NormalizeOptional(request.ReferenceRange),
            Interpretation = NormalizeOptional(request.Interpretation),
            File = file,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.LabResults.Add(labResult);

        if (item.LabRequest.Status == LabRequestStatus.Requested)
        {
            item.LabRequest.Status = LabRequestStatus.InProgress;
            item.LabRequest.UpdatedAt = now;
            item.LabRequest.UpdatedById = actorUserId;
        }

        item.Status = LabRequestStatus.InProgress;
        item.UpdatedAt = now;
        item.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labResult.Id, cancellationToken)
            ?? throw new InvalidOperationException("Lab result created but could not be loaded.");
    }

    public async Task<LabResultDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await BaseQuery()
            .Where(r => r.Id == id)
            .Select(MapToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<LabResultDto>> GetLabResultsAsync(
        int? patientProfileId,
        CancellationToken cancellationToken)
    {
        var query = BaseQuery();

        if (patientProfileId.HasValue)
            query = query.Where(r => r.LabRequestItem.LabRequest.Encounter.PatientProfileId == patientProfileId.Value);

        return await query
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Select(MapToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<LabResultDto>> GetPublishedForPatientUserAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        return await BaseQuery()
            .Where(r =>
                r.VerifiedAt != null &&
                r.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.UserId == userId)
            .OrderByDescending(r => r.VerifiedAt)
            .ThenByDescending(r => r.Id)
            .Select(MapToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabResultDto> PublishAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new InvalidOperationException("Authenticated user is required.");

        var labResult = await _db.LabResults
            .Include(r => r.LabRequestItem)
                .ThenInclude(i => i.LabRequest)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (labResult == null)
            throw new InvalidOperationException("Lab result not found.");

        if (labResult.VerifiedAt != null)
            throw new InvalidOperationException("Lab result is already verified.");

        var now = DateTime.UtcNow;
        labResult.VerifiedByUserId = actorUserId;
        labResult.VerifiedAt = now;
        labResult.UpdatedAt = now;
        labResult.UpdatedById = actorUserId;
        labResult.LabRequestItem.Status = LabRequestStatus.Completed;
        labResult.LabRequestItem.UpdatedAt = now;
        labResult.LabRequestItem.UpdatedById = actorUserId;

        var labRequest = labResult.LabRequestItem.LabRequest;
        var allItemsHavePublishedResults = await _db.LabRequestItems
            .Where(i => i.LabRequestId == labRequest.Id)
            .AllAsync(
                i => i.Results.Any(r => r.VerifiedAt != null || r.Id == labResult.Id),
                cancellationToken);

        if (allItemsHavePublishedResults)
        {
            labRequest.Status = LabRequestStatus.Completed;
            labRequest.CompletedAt ??= now;
        }
        else if (labRequest.Status is LabRequestStatus.Requested or LabRequestStatus.SampleCollected)
        {
            labRequest.Status = LabRequestStatus.InProgress;
        }

        labRequest.UpdatedAt = now;
        labRequest.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labResult.Id, cancellationToken)
            ?? throw new InvalidOperationException("Published but not found.");
    }

    public async Task<LabResultAttachmentDto?> GetAttachmentAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await BaseQuery()
            .Where(r => r.Id == id && r.FileId != null)
            .Select(MapToAttachmentDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<LabResultAttachmentDto?> GetPublishedAttachmentForPatientUserAsync(
        int id,
        int userId,
        CancellationToken cancellationToken)
    {
        return await BaseQuery()
            .Where(r =>
                r.Id == id &&
                r.VerifiedAt != null &&
                r.FileId != null &&
                r.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.UserId == userId)
            .Select(MapToAttachmentDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private IQueryable<LabResult> BaseQuery()
    {
        return _db.LabResults.AsNoTracking();
    }

    private static readonly Expression<Func<LabResult, LabResultDto>> MapToDto =
        result => new LabResultDto
        {
            Id = result.Id,
            LabRequestItemId = result.LabRequestItemId,
            LabRequestId = result.LabRequestItem.LabRequestId,
            RequestNumber = result.LabRequestItem.LabRequest.RequestNumber,
            EncounterId = result.LabRequestItem.LabRequest.EncounterId,
            PatientProfileId = result.LabRequestItem.LabRequest.Encounter.PatientProfileId,
            PatientName = result.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.FirstName + " " + result.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.LastName,
            TestName = result.LabRequestItem.LabTest.Name,
            TestCode = null,
            ResultData = result.ResultData,
            ReferenceRange = result.ReferenceRange,
            Interpretation = result.Interpretation,
            FileId = result.FileId,
            HasAttachment = result.FileId != null,
            AttachmentFileName = result.File != null ? result.File.OriginalFileName : null,
            AttachmentContentType = result.File != null ? result.File.ContentType : null,
            AttachmentSizeBytes = result.File != null ? result.File.SizeBytes : null,
            VerifiedByUserId = result.VerifiedByUserId,
            VerifiedByUserName = result.VerifiedByUser != null ? result.VerifiedByUser.UserName : null,
            VerifiedAt = result.VerifiedAt,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt
        };

    private static readonly Expression<Func<LabResult, LabResultAttachmentDto>> MapToAttachmentDto =
        result => new LabResultAttachmentDto
        {
            LabResultId = result.Id,
            FileId = result.FileId!.Value,
            FileName = result.File!.OriginalFileName,
            ContentType = result.File.ContentType,
            SizeBytes = result.File.SizeBytes,
            StoragePath = result.File.StoragePath
        };

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }
}
