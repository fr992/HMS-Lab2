using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Identity.Infrastructure.Services;

public sealed class LabRequestService : ILabRequestService
{
    private readonly HmsDbContext _db;

    public LabRequestService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<LabRequestDto> CreateAsync(
        int encounterId,
        CreateLabRequestDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new InvalidOperationException("Authenticated user is required.");

        if (request == null)
            throw new InvalidOperationException("Lab request payload is required.");

        if (request.Items == null || request.Items.Count == 0)
            throw new InvalidOperationException("Lab request must contain at least one analysis.");

        var encounter = await _db.Encounters
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == encounterId, cancellationToken);

        if (encounter == null)
            throw new InvalidOperationException("Encounter not found.");

        if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
            throw new InvalidOperationException("Lab requests can only be created for an open encounter.");

        var doctor = await _db.DoctorProfiles
            .Include(d => d.StaffProfile)
                .ThenInclude(s => s.Person)
            .FirstOrDefaultAsync(
                d =>
                    d.IsActive &&
                    d.StaffProfile.Person.UserId == actorUserId,
                cancellationToken);

        if (doctor == null)
            throw new InvalidOperationException("Current user is not linked to an active doctor profile.");

        if (encounter.DoctorProfileId != doctor.Id)
            throw new InvalidOperationException("Only the encounter doctor can create lab requests.");

        var priority = string.IsNullOrWhiteSpace(request.Priority)
            ? LabRequestPriority.Routine
            : request.Priority.Trim().ToLowerInvariant();

        if (!LabRequestPriority.IsValid(priority))
            throw new InvalidOperationException("Lab request priority must be routine, urgent, or stat.");

        var labTestIds = request.Items
            .Select(item => item.LabTestId)
            .Distinct()
            .ToList();

        if (labTestIds.Any(id => id <= 0))
            throw new InvalidOperationException("Lab test is required for every requested analysis.");

        var activeLabTestIds = await _db.LabTests
            .Where(test => labTestIds.Contains(test.Id) && test.IsActive)
            .Select(test => test.Id)
            .ToListAsync(cancellationToken);

        foreach (var labTestId in labTestIds)
        {
            if (!activeLabTestIds.Contains(labTestId))
                throw new InvalidOperationException("Every requested analysis must reference an active lab test.");
        }

        var now = DateTime.UtcNow;

        var labRequest = new LabRequest
        {
            RequestNumber = GenerateRequestNumber(now),
            EncounterId = encounterId,
            RequestedByDoctorId = doctor.Id,
            Priority = priority,
            Status = LabRequestStatus.Requested,
            ClinicalNotes = NormalizeOptional(request.ClinicalNotes),
            RequestedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId,
            Items = request.Items.Select(i => new LabRequestItem
            {
                LabTestId = i.LabTestId,
                Status = LabRequestStatus.Requested,
                Notes = NormalizeOptional(i.Notes),
                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            }).ToList()
        };

        _db.LabRequests.Add(labRequest);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labRequest.Id, cancellationToken)
            ?? throw new InvalidOperationException("Lab request created but could not be loaded.");
    }

    public async Task<LabRequestDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await BaseQuery()
            .Where(lr => lr.Id == id)
            .Select(MapToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<LabRequestDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken)
    {
        var encounterExists = await _db.Encounters
            .AnyAsync(e => e.Id == encounterId, cancellationToken);

        if (!encounterExists)
            throw new InvalidOperationException("Encounter not found.");

        return await BaseQuery()
            .Where(lr => lr.EncounterId == encounterId)
            .OrderByDescending(lr => lr.RequestedAt)
            .ThenByDescending(lr => lr.Id)
            .Select(MapToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<LabRequestDto>> GetLabRequestsAsync(
        string? status,
        CancellationToken cancellationToken)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();

            if (!LabRequestStatus.IsValid(normalizedStatus))
                throw new InvalidOperationException("Invalid lab request status.");

            query = query.Where(lr => lr.Status == normalizedStatus);
        }

        return await query
            .OrderByDescending(lr => lr.RequestedAt)
            .ThenByDescending(lr => lr.Id)
            .Select(MapToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabRequestDto> UpdateStatusAsync(
        int id,
        UpdateLabRequestStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var labRequest = await _db.LabRequests
            .FirstOrDefaultAsync(lr => lr.Id == id, cancellationToken);

        if (labRequest == null)
            throw new InvalidOperationException("Lab request not found.");

        if (request == null)
            throw new InvalidOperationException("Status payload is required.");

        if (string.IsNullOrWhiteSpace(request.Status))
            throw new InvalidOperationException("Status is required.");

        var status = request.Status.Trim().ToLowerInvariant();

        if (!LabRequestStatus.IsValid(status))
            throw new InvalidOperationException("Invalid lab request status.");

        if (string.Equals(labRequest.Status, status, StringComparison.Ordinal))
            throw new InvalidOperationException("Lab request already has this status.");

        if (labRequest.Status is LabRequestStatus.Completed or LabRequestStatus.Cancelled)
            throw new InvalidOperationException("Completed or cancelled lab requests cannot change status.");

        var now = DateTime.UtcNow;
        labRequest.Status = status;
        labRequest.UpdatedAt = now;
        labRequest.UpdatedById = actorUserId;

        if (status == LabRequestStatus.SampleCollected)
            labRequest.CollectedAt ??= now;

        if (status == LabRequestStatus.Completed)
        {
            labRequest.CollectedAt ??= now;
            labRequest.CompletedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labRequest.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    private IQueryable<LabRequest> BaseQuery()
    {
        return _db.LabRequests
            .AsNoTracking();
    }

    private static readonly Expression<Func<LabRequest, LabRequestDto>> MapToDto =
        labRequest => new LabRequestDto
        {
            Id = labRequest.Id,
            RequestNumber = labRequest.RequestNumber,
            EncounterId = labRequest.EncounterId,
            PatientProfileId = labRequest.Encounter.PatientProfileId,
            PatientName = labRequest.Encounter.PatientProfile.Person.FirstName + " " + labRequest.Encounter.PatientProfile.Person.LastName,
            RequestedByDoctorId = labRequest.RequestedByDoctorId,
            RequestedByDoctorName = labRequest.RequestedByDoctor.StaffProfile.Person.FirstName + " " + labRequest.RequestedByDoctor.StaffProfile.Person.LastName,
            Priority = labRequest.Priority,
            Status = labRequest.Status,
            ClinicalNotes = labRequest.ClinicalNotes,
            RequestedAt = labRequest.RequestedAt,
            CollectedAt = labRequest.CollectedAt,
            CompletedAt = labRequest.CompletedAt,
            CreatedAt = labRequest.CreatedAt,
            UpdatedAt = labRequest.UpdatedAt,
            Items = labRequest.Items
                .OrderBy(i => i.Id)
                .Select(i => new LabRequestItemDto
                {
                    Id = i.Id,
                    LabRequestId = i.LabRequestId,
                    LabTestId = i.LabTestId,
                    TestCode = null,
                    TestName = i.LabTest.Name,
                    Status = i.Status,
                    Notes = i.Notes,
                    Results = i.Results
                        .OrderByDescending(r => r.CreatedAt)
                        .ThenByDescending(r => r.Id)
                        .Select(r => new LabResultDto
                        {
                            Id = r.Id,
                            LabRequestItemId = r.LabRequestItemId,
                            LabRequestId = r.LabRequestItem.LabRequestId,
                            RequestNumber = r.LabRequestItem.LabRequest.RequestNumber,
                            EncounterId = r.LabRequestItem.LabRequest.EncounterId,
                            PatientProfileId = r.LabRequestItem.LabRequest.Encounter.PatientProfileId,
                            PatientName = r.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.FirstName + " " + r.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.LastName,
                            TestName = r.LabRequestItem.LabTest.Name,
                            TestCode = null,
                            ResultData = r.ResultData,
                            ReferenceRange = r.ReferenceRange,
                            Interpretation = r.Interpretation,
                            FileId = r.FileId,
                            HasAttachment = r.FileId != null,
                            AttachmentFileName = r.File != null ? r.File.OriginalFileName : null,
                            AttachmentContentType = r.File != null ? r.File.ContentType : null,
                            AttachmentSizeBytes = r.File != null ? r.File.SizeBytes : null,
                            VerifiedByUserId = r.VerifiedByUserId,
                            VerifiedByUserName = r.VerifiedByUser != null ? r.VerifiedByUser.UserName : null,
                            VerifiedAt = r.VerifiedAt,
                            CreatedAt = r.CreatedAt,
                            UpdatedAt = r.UpdatedAt
                        }).ToList()
                }).ToList()
        };

    private static string GenerateRequestNumber(DateTime now)
    {
        return $"LAB-{now:yyyyMMddHHmmssfff}";
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }
}
