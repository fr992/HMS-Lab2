using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
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
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new UnauthorizedException("Authenticated user is required.");

        if (request == null)
            throw new BadRequestException("Lab request payload is required.");

        if (request.Items == null || request.Items.Count == 0)
            throw new BadRequestException("Lab request must contain at least one analysis.");

        var encounter = await _db.Encounters
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == encounterId, cancellationToken);

        if (encounter == null)
            throw new NotFoundException("Encounter not found.");

        if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
            throw new ConflictException("Lab requests can only be created for an open encounter.");

        var requestedByDoctorId = await ResolveRequestingDoctorProfileIdAsync(
            encounter.DoctorProfileId,
            actorUserId.Value,
            actorRoles,
            cancellationToken);

        var priority = string.IsNullOrWhiteSpace(request.Priority)
            ? LabRequestPriority.Routine
            : request.Priority.Trim().ToLowerInvariant();

        if (!LabRequestPriority.IsValid(priority))
            throw new BadRequestException("Lab request priority must be routine, urgent, or stat.");

        foreach (var item in request.Items)
        {
            if (item.LabTestId <= 0)
                throw new BadRequestException("Lab test is required for every request item.");
        }

        var requestedLabTestIds = request.Items
            .Select(i => i.LabTestId)
            .ToList();

        var duplicateCatalogKeys = requestedLabTestIds
            .GroupBy(id => id)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicateCatalogKeys.Count > 0)
            throw new ConflictException("Lab request contains duplicate tests.");

        var catalogTests = await _db.LabTests
            .AsNoTracking()
            .Where(test => requestedLabTestIds.Contains(test.Id))
            .ToListAsync(cancellationToken);

        var catalogTestsById = catalogTests.ToDictionary(test => test.Id);

        var matchedItems = request.Items.Select(item =>
        {
            if (!catalogTestsById.TryGetValue(item.LabTestId, out var catalogTest))
                throw new NotFoundException($"Lab test #{item.LabTestId} was not found.");

            if (!catalogTest.IsActive)
                throw new ConflictException($"Lab test '{catalogTest.Name}' is not active in the lab test catalog.");

            return (Source: item, CatalogTest: catalogTest);
        }).ToList();

        var now = DateTime.UtcNow;

        var labRequest = new LabRequest
        {
            RequestNumber = GenerateRequestNumber(now),
            EncounterId = encounterId,
            RequestedByDoctorId = requestedByDoctorId,
            Priority = priority,
            Status = LabRequestStatus.Requested,
            ClinicalNotes = NormalizeOptional(request.ClinicalNotes),
            RequestedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId,
            Items = matchedItems.Select(i => new LabRequestItem
            {
                LabTestId = i.CatalogTest.Id,
                Status = LabRequestStatus.Requested,
                Notes = NormalizeOptional(i.Source.Notes),
                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            }).ToList()
        };

        _db.LabRequests.Add(labRequest);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labRequest.Id, cancellationToken)
            ?? throw new Exception("Lab request was created but could not be loaded.");
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
            throw new NotFoundException("Encounter not found.");

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
                throw new BadRequestException("Invalid lab request status.");

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
            throw new NotFoundException("Lab request not found.");

        if (request == null)
            throw new BadRequestException("Status payload is required.");

        if (string.IsNullOrWhiteSpace(request.Status))
            throw new BadRequestException("Status is required.");

        var status = request.Status.Trim().ToLowerInvariant();

        if (!LabRequestStatus.IsValid(status))
            throw new BadRequestException("Invalid lab request status.");

        if (string.Equals(labRequest.Status, status, StringComparison.Ordinal))
            throw new ConflictException("Lab request already has this status.");

        if (labRequest.Status is LabRequestStatus.Completed or LabRequestStatus.Cancelled)
            throw new ConflictException("Completed or cancelled lab requests cannot change status.");

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
            ?? throw new Exception("Lab request was updated but could not be loaded.");
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
                    TestCode = i.LabTest.TestCode,
                    TestName = i.LabTest.Name,
                    SpecimenType = i.LabTest.SpecimenType,
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
                            TestCode = r.LabRequestItem.LabTest.TestCode,
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

    private async Task<int> ResolveRequestingDoctorProfileIdAsync(
        int encounterDoctorProfileId,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        if (HasRole(roleList, "Admin") || HasRole(roleList, "SuperAdmin"))
            return encounterDoctorProfileId;

        if (!HasRole(roleList, "Doctor"))
            throw new ForbiddenException("Only admins and doctors can create lab requests.");

        var doctorProfileId = await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d =>
                d.IsActive &&
                d.StaffProfile.Person.UserId == actorUserId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (doctorProfileId == null)
            throw new ForbiddenException("Current user is not linked to an active doctor profile.");

        if (encounterDoctorProfileId != doctorProfileId.Value)
            throw new ForbiddenException("Only the encounter doctor can create lab requests.");

        return doctorProfileId.Value;
    }

    private static bool HasRole(IEnumerable<string> roles, string roleName)
    {
        return roles.Any(role => string.Equals(role, roleName, StringComparison.OrdinalIgnoreCase));
    }
}
