using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class BedAssignmentRequestService : IBedAssignmentRequestService
{
    private static readonly string[] AllowedPriorities = ["routine", "urgent", "stat"];

    private readonly HmsDbContext _db;
    private readonly IBedService _bedService;

    public BedAssignmentRequestService(HmsDbContext db, IBedService bedService)
    {
        _db = db;
        _bedService = bedService;
    }

    public async Task<BedAssignmentRequestDto> CreateForEncounterAsync(
        int encounterId,
        CreateBedAssignmentRequestDto request,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        var encounter = await _db.Encounters
            .AsNoTracking()
            .Where(e => e.Id == encounterId)
            .Select(e => new
            {
                e.Id,
                e.PatientProfileId,
                e.DoctorProfileId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (encounter is null)
            throw new NotFoundException("Encounter not found.");

        var requestedByDoctorId = encounter.DoctorProfileId;
        if (HasRole(roleList, "Doctor"))
        {
            requestedByDoctorId = await ResolveDoctorProfileIdAsync(actorUserId, cancellationToken);
            if (requestedByDoctorId != encounter.DoctorProfileId)
                throw new ForbiddenException("Doctor can only request beds for their own encounters.");
        }
        else if (!HasRole(roleList, "Admin") && !HasRole(roleList, "SuperAdmin"))
        {
            throw new ForbiddenException("Only doctors and admins can request beds from encounters.");
        }

        var hasPendingRequest = await _db.BedAssignmentRequests
            .AsNoTracking()
            .AnyAsync(
                x => x.EncounterId == encounter.Id
                    && x.PatientProfileId == encounter.PatientProfileId
                    && x.Status == BedAssignmentRequestStatus.Pending,
                cancellationToken);

        if (hasPendingRequest)
            throw new ConflictException("This encounter already has a pending bed request.");

        var hasActiveBed = await _db.BedAssignments
            .AsNoTracking()
            .AnyAsync(
                x => x.PatientProfileId == encounter.PatientProfileId && x.ReleasedAt == null,
                cancellationToken);

        if (hasActiveBed)
            throw new ConflictException("Patient already has an active bed assignment.");

        var now = DateTime.UtcNow;
        var entity = new BedAssignmentRequest
        {
            EncounterId = encounter.Id,
            PatientProfileId = encounter.PatientProfileId,
            RequestedByDoctorId = requestedByDoctorId,
            Status = BedAssignmentRequestStatus.Pending,
            Priority = NormalizePriority(request.Priority),
            Notes = NormalizeOptional(request.Notes),
            PreferredWard = NormalizeOptional(request.PreferredWard),
            RequestedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.BedAssignmentRequests.Add(entity);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new ConflictException("This encounter already has a pending bed request.");
        }

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<BedAssignmentRequestDto>> GetForEncounterAsync(
        int encounterId,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        await EnsureCanReadEncounterAsync(encounterId, actorUserId, actorRoles, cancellationToken);

        return await ProjectToDto(_db.BedAssignmentRequests
                .AsNoTracking()
                .Where(x => x.EncounterId == encounterId)
                .OrderByDescending(x => x.RequestedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BedAssignmentRequestDto>> GetRequestsAsync(
        string? status,
        CancellationToken cancellationToken)
    {
        var normalizedStatus = NormalizeOptional(status);
        var query = _db.BedAssignmentRequests.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(normalizedStatus))
        {
            query = query.Where(x => x.Status == NormalizeStatus(normalizedStatus));
        }

        return await ProjectToDto(query
                .OrderBy(x => x.Status == BedAssignmentRequestStatus.Pending ? 0 : 1)
                .ThenByDescending(x => x.RequestedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<BedAssignmentRequestDto> AssignAsync(
        int requestId,
        AssignBedAssignmentRequestDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.BedId <= 0)
            throw new BadRequestException("Available bed is required.");

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var entity = await _db.BedAssignmentRequests
            .FirstOrDefaultAsync(x => x.Id == requestId, cancellationToken);

        if (entity is null)
            throw new NotFoundException("Bed assignment request not found.");

        EnsurePending(entity);

        var assignment = await _bedService.AssignAsync(
            request.BedId,
            new AssignBedDto
            {
                PatientProfileId = entity.PatientProfileId,
                EncounterId = entity.EncounterId,
                Notes = NormalizeOptional(request.Notes) ?? entity.Notes
            },
            actorUserId,
            cancellationToken);

        var now = DateTime.UtcNow;
        entity.Status = BedAssignmentRequestStatus.Assigned;
        entity.ResolvedAt = now;
        entity.ResolvedByUserId = actorUserId;
        entity.BedAssignmentId = assignment.Id;
        entity.UpdatedAt = now;
        entity.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<BedAssignmentRequestDto> RejectAsync(
        int requestId,
        RejectBedAssignmentRequestDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var entity = await _db.BedAssignmentRequests
            .FirstOrDefaultAsync(x => x.Id == requestId, cancellationToken);

        if (entity is null)
            throw new NotFoundException("Bed assignment request not found.");

        EnsurePending(entity);

        var now = DateTime.UtcNow;
        entity.Status = BedAssignmentRequestStatus.Rejected;
        entity.ResolvedAt = now;
        entity.ResolvedByUserId = actorUserId;
        entity.Notes = MergeResolutionNote(entity.Notes, request.Reason);
        entity.UpdatedAt = now;
        entity.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    private async Task<BedAssignmentRequestDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var dto = await ProjectToDto(_db.BedAssignmentRequests
                .AsNoTracking()
                .Where(x => x.Id == id))
            .FirstOrDefaultAsync(cancellationToken);

        return dto ?? throw new NotFoundException("Bed assignment request not found.");
    }

    private async Task EnsureCanReadEncounterAsync(
        int encounterId,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();
        if (HasRole(roleList, "Admin") || HasRole(roleList, "SuperAdmin") || HasRole(roleList, "Receptionist"))
            return;

        if (!HasRole(roleList, "Doctor"))
            throw new ForbiddenException("Only admins, reception, and doctors can read bed requests.");

        var doctorProfileId = await ResolveDoctorProfileIdAsync(actorUserId, cancellationToken);
        var allowed = await _db.Encounters
            .AsNoTracking()
            .AnyAsync(e => e.Id == encounterId && e.DoctorProfileId == doctorProfileId, cancellationToken);

        if (!allowed)
            throw new ForbiddenException("Doctor can only view bed requests for their own encounters.");
    }

    private async Task<int> ResolveDoctorProfileIdAsync(int userId, CancellationToken cancellationToken)
    {
        var doctorProfileId = await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d => d.IsActive && d.StaffProfile.Person.UserId == userId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return doctorProfileId
            ?? throw new ForbiddenException("Current user is not linked to an active doctor profile.");
    }

    private static IQueryable<BedAssignmentRequestDto> ProjectToDto(IQueryable<BedAssignmentRequest> query)
    {
        return query.Select(x => new BedAssignmentRequestDto
        {
            Id = x.Id,
            EncounterId = x.EncounterId,
            EncounterNumber = x.Encounter.EncounterNumber,
            PatientProfileId = x.PatientProfileId,
            PatientName = x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName,
            PatientNumber = x.PatientProfile.PatientNumber,
            RequestedByDoctorId = x.RequestedByDoctorId,
            RequestedByDoctorName =
                x.RequestedByDoctor.StaffProfile.Person.FirstName + " " + x.RequestedByDoctor.StaffProfile.Person.LastName,
            Status = x.Status,
            Priority = x.Priority,
            Notes = x.Notes,
            PreferredWard = x.PreferredWard,
            RequestedAt = x.RequestedAt,
            ResolvedAt = x.ResolvedAt,
            ResolvedByUserId = x.ResolvedByUserId,
            BedAssignmentId = x.BedAssignmentId,
            AssignedBedLabel = x.BedAssignment == null
                ? null
                : x.BedAssignment.Bed.Ward + " / " + x.BedAssignment.Bed.RoomNumber + " / " + x.BedAssignment.Bed.BedNumber,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        });
    }

    private static void EnsurePending(BedAssignmentRequest entity)
    {
        if (entity.Status != BedAssignmentRequestStatus.Pending)
            throw new ConflictException("Only pending bed assignment requests can be resolved.");
    }

    private static string NormalizePriority(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "routine" : value.Trim().ToLowerInvariant();
        if (!AllowedPriorities.Contains(normalized, StringComparer.OrdinalIgnoreCase))
            throw new BadRequestException("Priority must be routine, urgent, or stat.");

        return normalized;
    }

    private static string NormalizeStatus(string value)
    {
        var normalized = value.Trim();
        if (string.Equals(normalized, BedAssignmentRequestStatus.Pending, StringComparison.OrdinalIgnoreCase))
            return BedAssignmentRequestStatus.Pending;
        if (string.Equals(normalized, BedAssignmentRequestStatus.Assigned, StringComparison.OrdinalIgnoreCase))
            return BedAssignmentRequestStatus.Assigned;
        if (string.Equals(normalized, BedAssignmentRequestStatus.Rejected, StringComparison.OrdinalIgnoreCase))
            return BedAssignmentRequestStatus.Rejected;
        if (string.Equals(normalized, BedAssignmentRequestStatus.Cancelled, StringComparison.OrdinalIgnoreCase))
            return BedAssignmentRequestStatus.Cancelled;

        throw new BadRequestException("Status must be Pending, Assigned, Rejected, or Cancelled.");
    }

    private static string? MergeResolutionNote(string? notes, string? reason)
    {
        var normalizedReason = NormalizeOptional(reason);
        if (normalizedReason is null)
            return notes;

        return string.IsNullOrWhiteSpace(notes)
            ? $"Rejection reason: {normalizedReason}"
            : $"{notes}{Environment.NewLine}Rejection reason: {normalizedReason}";
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static bool HasRole(IEnumerable<string> roles, string roleName)
    {
        return roles.Any(role => string.Equals(role, roleName, StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        return exception.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true
            || exception.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) == true;
    }
}
