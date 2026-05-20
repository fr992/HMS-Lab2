using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class BedService : IBedService
{
    private readonly HmsDbContext _db;

    public BedService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<BedDto>> GetBedsAsync(
        string? status,
        int? departmentId,
        CancellationToken cancellationToken)
    {
        var normalizedStatus = NormalizeOptional(status);

        var query = _db.Beds
            .AsNoTracking()
            .Where(x => !departmentId.HasValue || x.DepartmentId == departmentId.Value);

        if (string.Equals(normalizedStatus, BedOccupancyStatus.Inactive, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => !x.IsActive);
        }
        else if (string.Equals(normalizedStatus, BedOccupancyStatus.Available, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.IsActive && !x.Assignments.Any(a => a.ReleasedAt == null));
        }
        else if (string.Equals(normalizedStatus, BedOccupancyStatus.Occupied, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.IsActive && x.Assignments.Any(a => a.ReleasedAt == null));
        }
        else if (!string.IsNullOrWhiteSpace(normalizedStatus))
        {
            throw new BadRequestException("Bed status must be Available, Occupied, or Inactive.");
        }

        return await ProjectBedsToDto(query
                .OrderBy(x => x.Ward)
                .ThenBy(x => x.RoomNumber)
                .ThenBy(x => x.BedNumber))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BedPatientDetailsDto>> GetBedsWithOccupancyByDepartmentAsync(
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var loggedInDepartmentId = await _db.StaffProfiles
            .AsNoTracking()
            .Where(sp => sp.Person.UserId == actorUserId)
            .Select(sp => sp.DepartmentId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!loggedInDepartmentId.HasValue)
            return Array.Empty<BedPatientDetailsDto>();

        return await _db.Beds
            .AsNoTracking()
            .Where(b => b.DepartmentId == loggedInDepartmentId)
            .OrderBy(b => b.Ward)
            .ThenBy(b => b.RoomNumber)
            .ThenBy(b => b.BedNumber)
            .Select(b => new BedPatientDetailsDto
            {
                BedId = b.Id,
                BedLabel = b.BedNumber,
                Ward = b.Ward,
                RoomNumber = b.RoomNumber,
                Floor = b.Floor,
                DepartmentName = b.Department == null ? null : b.Department.Name,
                IsActive = b.IsActive,
                Status = !b.IsActive
                    ? BedOccupancyStatus.Inactive
                    : !b.Assignments.Any(a => a.ReleasedAt == null)
                        ? BedOccupancyStatus.Available
                        : BedOccupancyStatus.Occupied,
                Notes = b.Notes,

                PatientProfileId = b.Assignments
                    .Where(a => a.ReleasedAt == null)
                    .Select(a => (int?)a.PatientProfileId)
                    .FirstOrDefault(),
                PatientName = b.Assignments
                    .Where(a => a.ReleasedAt == null)
                    .Select(a => a.PatientProfile.Person.FirstName + " " + a.PatientProfile.Person.LastName)
                    .FirstOrDefault(),
                PatientNumber = b.Assignments
                    .Where(a => a.ReleasedAt == null)
                    .Select(a => a.PatientProfile.PatientNumber)
                    .FirstOrDefault(),
                EncounterId = b.Assignments
                    .Where(a => a.ReleasedAt == null)
                    .Select(a => a.EncounterId)
                    .FirstOrDefault(),
                EncounterNumber = b.Assignments
                    .Where(a => a.ReleasedAt == null)
                    .Select(a => a.Encounter == null ? null : a.Encounter.EncounterNumber)
                    .FirstOrDefault(),
                AssignedAt = b.Assignments
                    .Where(a => a.ReleasedAt == null)
                    .Select(a => (DateTime?)a.AssignedAt)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<BedDto> GetBedAsync(int id, CancellationToken cancellationToken)
    {
        var bed = await ProjectBedsToDto(_db.Beds.AsNoTracking().Where(x => x.Id == id))
            .FirstOrDefaultAsync(cancellationToken);

        if (bed is null)
            throw new NotFoundException("Bed not found.");

        return bed;
    }

    public async Task<BedDto> CreateBedAsync(
        CreateBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        await EnsureDepartmentExistsAsync(request.DepartmentId, cancellationToken);
        await EnsureBedLabelIsUniqueAsync(null, request.Ward, request.RoomNumber, request.BedNumber, cancellationToken);

        var now = DateTime.UtcNow;
        var bed = new Bed
        {
            Ward = NormalizeRequired(request.Ward, "Ward is required."),
            RoomNumber = NormalizeRequired(request.RoomNumber, "Room number is required."),
            BedNumber = NormalizeRequired(request.BedNumber, "Bed number is required."),
            Floor = NormalizeOptional(request.Floor),
            DepartmentId = request.DepartmentId,
            IsActive = true,
            Notes = NormalizeOptional(request.Notes),
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.Beds.Add(bed);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetBedAsync(bed.Id, cancellationToken);
    }

    public async Task<BedDto> UpdateBedAsync(
        int id,
        UpdateBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var bed = await _db.Beds.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (bed is null)
            throw new NotFoundException("Bed not found.");

        await EnsureDepartmentExistsAsync(request.DepartmentId, cancellationToken);
        await EnsureBedLabelIsUniqueAsync(id, request.Ward, request.RoomNumber, request.BedNumber, cancellationToken);

        if (!request.IsActive)
        {
            var occupied = await HasActiveAssignmentAsync(id, cancellationToken);
            if (occupied)
                throw new ConflictException("Occupied beds cannot be deactivated. Release the bed first.");
        }

        bed.Ward = NormalizeRequired(request.Ward, "Ward is required.");
        bed.RoomNumber = NormalizeRequired(request.RoomNumber, "Room number is required.");
        bed.BedNumber = NormalizeRequired(request.BedNumber, "Bed number is required.");
        bed.Floor = NormalizeOptional(request.Floor);
        bed.DepartmentId = request.DepartmentId;
        bed.IsActive = request.IsActive;
        bed.Notes = NormalizeOptional(request.Notes);
        bed.UpdatedAt = DateTime.UtcNow;
        bed.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetBedAsync(bed.Id, cancellationToken);
    }

    public async Task<BedAssignmentDto> AssignAsync(
        int bedId,
        AssignBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.PatientProfileId <= 0)
            throw new BadRequestException("Patient profile is required.");

        var bed = await _db.Beds.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == bedId, cancellationToken);

        if (bed is null)
            throw new NotFoundException("Bed not found.");

        if (!bed.IsActive)
            throw new ConflictException("Inactive beds cannot be assigned.");

        var patientExists = await _db.PatientProfiles
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.PatientProfileId, cancellationToken);

        if (!patientExists)
            throw new NotFoundException("Patient not found.");

        if (request.EncounterId.HasValue)
            await EnsureEncounterMatchesPatientAsync(request.EncounterId.Value, request.PatientProfileId, cancellationToken);

        if (await HasActiveAssignmentAsync(bedId, cancellationToken))
            throw new ConflictException("Bed is already assigned to another patient.");

        var patientAlreadyAssigned = await _db.BedAssignments
            .AsNoTracking()
            .AnyAsync(x => x.PatientProfileId == request.PatientProfileId && x.ReleasedAt == null, cancellationToken);

        if (patientAlreadyAssigned)
            throw new ConflictException("Patient already has an active bed assignment.");

        var now = DateTime.UtcNow;
        var assignment = new BedAssignment
        {
            BedId = bedId,
            PatientProfileId = request.PatientProfileId,
            EncounterId = request.EncounterId,
            AssignedAt = now,
            AssignedByUserId = actorUserId,
            Notes = NormalizeOptional(request.Notes),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.BedAssignments.Add(assignment);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new ConflictException("Bed or patient already has an active assignment.");
        }

        return await GetAssignmentDtoAsync(assignment.Id, cancellationToken);
    }

    public async Task<BedAssignmentDto> ReleaseByBedAsync(
        int bedId,
        ReleaseBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var assignment = await _db.BedAssignments
            .Where(x => x.BedId == bedId && x.ReleasedAt == null)
            .FirstOrDefaultAsync(cancellationToken);

        if (assignment is null)
            throw new NotFoundException("Bed does not have an active assignment.");

        return await ReleaseAsync(assignment, request, actorUserId, cancellationToken);
    }

    public async Task<BedAssignmentDto> ReleaseAssignmentAsync(
        int assignmentId,
        ReleaseBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var assignment = await _db.BedAssignments
            .FirstOrDefaultAsync(x => x.Id == assignmentId, cancellationToken);

        if (assignment is null)
            throw new NotFoundException("Bed assignment not found.");

        if (assignment.ReleasedAt.HasValue)
            throw new ConflictException("Bed assignment is already released.");

        return await ReleaseAsync(assignment, request, actorUserId, cancellationToken);
    }

    public async Task<IReadOnlyList<BedAssignmentDto>> GetActiveAssignmentsAsync(CancellationToken cancellationToken)
    {
        return await ProjectAssignmentsToDto(_db.BedAssignments
                .AsNoTracking()
                .Where(x => x.ReleasedAt == null)
                .OrderBy(x => x.Bed.Ward)
                .ThenBy(x => x.Bed.RoomNumber)
                .ThenBy(x => x.Bed.BedNumber))
            .ToListAsync(cancellationToken);
    }

    private async Task<BedAssignmentDto> ReleaseAsync(
        BedAssignment assignment,
        ReleaseBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        assignment.ReleasedAt = now;
        assignment.ReleasedByUserId = actorUserId;
        assignment.ReleaseNotes = NormalizeOptional(request.ReleaseNotes);
        assignment.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetAssignmentDtoAsync(assignment.Id, cancellationToken);
    }

    private async Task EnsureDepartmentExistsAsync(int? departmentId, CancellationToken cancellationToken)
    {
        if (!departmentId.HasValue)
            return;

        var exists = await _db.Set<Department>()
            .AsNoTracking()
            .AnyAsync(x => x.Id == departmentId.Value, cancellationToken);

        if (!exists)
            throw new NotFoundException("Department not found.");
    }

    private async Task EnsureEncounterMatchesPatientAsync(
        int encounterId,
        int patientProfileId,
        CancellationToken cancellationToken)
    {
        var encounterPatientId = await _db.Encounters
            .AsNoTracking()
            .Where(x => x.Id == encounterId)
            .Select(x => (int?)x.PatientProfileId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!encounterPatientId.HasValue)
            throw new NotFoundException("Encounter not found.");

        if (encounterPatientId.Value != patientProfileId)
            throw new BadRequestException("Encounter does not belong to the selected patient.");
    }

    private async Task EnsureBedLabelIsUniqueAsync(
        int? currentBedId,
        string ward,
        string roomNumber,
        string bedNumber,
        CancellationToken cancellationToken)
    {
        var normalizedWard = NormalizeRequired(ward, "Ward is required.");
        var normalizedRoom = NormalizeRequired(roomNumber, "Room number is required.");
        var normalizedBed = NormalizeRequired(bedNumber, "Bed number is required.");

        var exists = await _db.Beds
            .AsNoTracking()
            .AnyAsync(x =>
                (!currentBedId.HasValue || x.Id != currentBedId.Value) &&
                x.Ward == normalizedWard &&
                x.RoomNumber == normalizedRoom &&
                x.BedNumber == normalizedBed,
                cancellationToken);

        if (exists)
            throw new ConflictException("A bed with the same ward, room, and bed number already exists.");
    }

    private async Task<bool> HasActiveAssignmentAsync(int bedId, CancellationToken cancellationToken)
    {
        return await _db.BedAssignments
            .AsNoTracking()
            .AnyAsync(x => x.BedId == bedId && x.ReleasedAt == null, cancellationToken);
    }

    private async Task<BedAssignmentDto> GetAssignmentDtoAsync(int id, CancellationToken cancellationToken)
    {
        var assignment = await ProjectAssignmentsToDto(_db.BedAssignments
                .AsNoTracking()
                .Where(x => x.Id == id))
            .FirstOrDefaultAsync(cancellationToken);

        if (assignment is null)
            throw new NotFoundException("Bed assignment not found.");

        return assignment;
    }

    private static IQueryable<BedDto> ProjectBedsToDto(IQueryable<Bed> query)
    {
        return query.Select(bed => new BedDto
        {
            Id = bed.Id,
            Ward = bed.Ward,
            RoomNumber = bed.RoomNumber,
            BedNumber = bed.BedNumber,
            Floor = bed.Floor,
            DepartmentId = bed.DepartmentId,
            DepartmentName = bed.Department == null ? null : bed.Department.Name,
            IsActive = bed.IsActive,
            Status = !bed.IsActive
                ? BedOccupancyStatus.Inactive
                : bed.Assignments.Any(x => x.ReleasedAt == null)
                    ? BedOccupancyStatus.Occupied
                    : BedOccupancyStatus.Available,
            Notes = bed.Notes,
            CurrentAssignment = bed.Assignments
                .Where(x => x.ReleasedAt == null)
                .Select(x => new BedAssignmentDto
                {
                    Id = x.Id,
                    BedId = x.BedId,
                    BedLabel = x.Bed.Ward + " / " + x.Bed.RoomNumber + " / " + x.Bed.BedNumber,
                    PatientProfileId = x.PatientProfileId,
                    PatientName = x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName,
                    PatientNumber = x.PatientProfile.PatientNumber,
                    EncounterId = x.EncounterId,
                    EncounterNumber = x.Encounter == null ? null : x.Encounter.EncounterNumber,
                    AssignedAt = x.AssignedAt,
                    AssignedByUserId = x.AssignedByUserId,
                    ReleasedAt = x.ReleasedAt,
                    ReleasedByUserId = x.ReleasedByUserId,
                    Notes = x.Notes,
                    ReleaseNotes = x.ReleaseNotes,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
                })
                .FirstOrDefault(),
            CreatedAt = bed.CreatedAt,
            UpdatedAt = bed.UpdatedAt
        });
    }

    private static IQueryable<BedAssignmentDto> ProjectAssignmentsToDto(IQueryable<BedAssignment> query)
    {
        return query.Select(x => new BedAssignmentDto
        {
            Id = x.Id,
            BedId = x.BedId,
            BedLabel = x.Bed.Ward + " / " + x.Bed.RoomNumber + " / " + x.Bed.BedNumber,
            PatientProfileId = x.PatientProfileId,
            PatientName = x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName,
            PatientNumber = x.PatientProfile.PatientNumber,
            EncounterId = x.EncounterId,
            EncounterNumber = x.Encounter == null ? null : x.Encounter.EncounterNumber,
            AssignedAt = x.AssignedAt,
            AssignedByUserId = x.AssignedByUserId,
            ReleasedAt = x.ReleasedAt,
            ReleasedByUserId = x.ReleasedByUserId,
            Notes = x.Notes,
            ReleaseNotes = x.ReleaseNotes,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        });
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        return exception.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true
            || exception.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) == true;
    }

    private static string NormalizeRequired(string? value, string errorMessage)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new BadRequestException(errorMessage);

        return value.Trim();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
