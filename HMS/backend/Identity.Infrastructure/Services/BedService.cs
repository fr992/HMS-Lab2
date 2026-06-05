using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class BedService : IBedService
{
    private readonly IHmsRepository _db;
    private readonly IUnitOfWork _unitOfWork;

    public BedService(
        IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedResponse<BedDto>> GetBedsAsync(
        BedListQueryDto query,
        CancellationToken cancellationToken)
    {
        var normalizedStatus = NormalizeOptional(query.Status);
        var normalizedAssignmentStatus = NormalizeOptional(query.AssignmentStatus);
        var search = NormalizeOptional(query.Search);
        var roomNumber = NormalizeOptional(query.RoomNumber);

        var beds = _db.Query<Bed>()
            .AsNoTracking()
            .Where(x => !query.DepartmentId.HasValue || x.DepartmentId == query.DepartmentId.Value);

        var activeAssignments = _db.Query<BedAssignment>()
            .AsNoTracking()
            .Where(x => x.ReleasedAt == null);

        if (!string.IsNullOrWhiteSpace(roomNumber))
        {
            beds = beds.Where(x => x.RoomNumber == roomNumber);
        }

        if (query.PatientProfileId.HasValue)
        {
            beds = beds.Where(x => activeAssignments.Any(a =>
                a.BedId == x.Id &&
                a.PatientProfileId == query.PatientProfileId.Value));
        }

        if (query.EncounterId.HasValue)
        {
            beds = beds.Where(x => activeAssignments.Any(a =>
                a.BedId == x.Id &&
                a.EncounterId == query.EncounterId.Value));
        }

        if (string.Equals(normalizedStatus, BedOccupancyStatus.Inactive, StringComparison.OrdinalIgnoreCase))
        {
            beds = beds.Where(x => !x.IsActive);
        }
        else if (string.Equals(normalizedStatus, BedOccupancyStatus.Available, StringComparison.OrdinalIgnoreCase))
        {
            beds = beds.Where(x => x.IsActive && !activeAssignments.Any(a => a.BedId == x.Id));
        }
        else if (string.Equals(normalizedStatus, BedOccupancyStatus.Occupied, StringComparison.OrdinalIgnoreCase))
        {
            beds = beds.Where(x => x.IsActive && activeAssignments.Any(a => a.BedId == x.Id));
        }
        else if (!string.IsNullOrWhiteSpace(normalizedStatus))
        {
            throw new BadRequestException("Bed status must be Available, Occupied, or Inactive.");
        }

        if (string.Equals(normalizedAssignmentStatus, "active", StringComparison.OrdinalIgnoreCase))
        {
            beds = beds.Where(x => activeAssignments.Any(a => a.BedId == x.Id));
        }
        else if (string.Equals(normalizedAssignmentStatus, "unassigned", StringComparison.OrdinalIgnoreCase))
        {
            beds = beds.Where(x => !activeAssignments.Any(a => a.BedId == x.Id));
        }
        else if (!string.IsNullOrWhiteSpace(normalizedAssignmentStatus) &&
                 !string.Equals(normalizedAssignmentStatus, "all", StringComparison.OrdinalIgnoreCase))
        {
            throw new BadRequestException("Assignment status must be active or unassigned.");
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            beds = beds.Where(x =>
                x.Ward.Contains(search) ||
                x.RoomNumber.Contains(search) ||
                x.BedNumber.Contains(search) ||
                (x.Floor != null && x.Floor.Contains(search)) ||
                (x.Notes != null && x.Notes.Contains(search)) ||
                (x.Department != null && x.Department.Name.Contains(search)) ||
                activeAssignments.Any(a =>
                    a.BedId == x.Id &&
                    (a.PatientProfile.PatientNumber.Contains(search) ||
                     a.PatientProfile.Person.FirstName.Contains(search) ||
                     a.PatientProfile.Person.LastName.Contains(search) ||
                     (a.Encounter != null && a.Encounter.EncounterNumber.Contains(search)))));
        }

        var orderedBeds = beds
            .OrderBy(x => x.Ward)
            .ThenBy(x => x.RoomNumber)
            .ThenBy(x => x.BedNumber);

        var totalCount = await orderedBeds.CountAsync(cancellationToken);
        var items = await ProjectBedsWithActiveAssignmentsToDto(
                orderedBeds
                    .Skip((query.Page - 1) * query.PageSize)
                    .Take(query.PageSize),
                activeAssignments)
            .ToListAsync(cancellationToken);

        return PaginatedResponse<BedDto>.Create(items, query.Page, query.PageSize, totalCount);
    }

    public async Task<PaginatedResponse<BedPatientDetailsDto>> GetBedsWithOccupancyByDepartmentAsync(
        int actorUserId,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var loggedInDepartmentId = await _db.Query<StaffProfile>()
            .AsNoTracking()
            .Where(sp => sp.Person.UserId == actorUserId)
            .Select(sp => sp.DepartmentId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!loggedInDepartmentId.HasValue)
            return PaginatedResponse<BedPatientDetailsDto>.Create([], pagination.Page, pagination.PageSize, 0);

        var beds = _db.Query<Bed>()
            .AsNoTracking()
            .Where(b => b.DepartmentId == loggedInDepartmentId);

        var activeAssignments = _db.Query<BedAssignment>()
            .AsNoTracking()
            .Where(a => a.ReleasedAt == null);

        var search = NormalizeOptional(pagination.Search);
        if (!string.IsNullOrWhiteSpace(search))
        {
            beds = beds.Where(b =>
                b.Ward.Contains(search) ||
                b.RoomNumber.Contains(search) ||
                b.BedNumber.Contains(search) ||
                (b.Floor != null && b.Floor.Contains(search)) ||
                (b.Notes != null && b.Notes.Contains(search)) ||
                (b.Department != null && b.Department.Name.Contains(search)) ||
                activeAssignments.Any(a =>
                    a.BedId == b.Id &&
                    (a.PatientProfile.PatientNumber.Contains(search) ||
                     a.PatientProfile.Person.FirstName.Contains(search) ||
                     a.PatientProfile.Person.LastName.Contains(search) ||
                     (a.Encounter != null && a.Encounter.EncounterNumber.Contains(search)))));
        }

        var orderedBeds = beds
            .OrderBy(b => b.Ward)
            .ThenBy(b => b.RoomNumber)
            .ThenBy(b => b.BedNumber);

        var totalCount = await orderedBeds.CountAsync(cancellationToken);
        var items = await ProjectBedsWithOccupancyToDto(
                orderedBeds
                    .Skip((pagination.Page - 1) * pagination.PageSize)
                    .Take(pagination.PageSize),
                activeAssignments)
            .ToListAsync(cancellationToken);

        return PaginatedResponse<BedPatientDetailsDto>.Create(items, pagination.Page, pagination.PageSize, totalCount);
    }

    public async Task<BedDto> GetBedAsync(int id, CancellationToken cancellationToken)
    {
        var bed = await ProjectBedsToDto(_db.Query<Bed>().AsNoTracking().Where(x => x.Id == id))
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

        _db.Add<Bed>(bed);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetBedAsync(bed.Id, cancellationToken);
    }

    public async Task<BedDto> UpdateBedAsync(
        int id,
        UpdateBedDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var bed = await _db.Query<Bed>().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

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

        await _unitOfWork.SaveChangesAsync(cancellationToken);

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

        var bed = await _db.Query<Bed>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == bedId, cancellationToken);

        if (bed is null)
            throw new NotFoundException("Bed not found.");

        if (!bed.IsActive)
            throw new ConflictException("Inactive beds cannot be assigned.");

        var patientExists = await _db.Query<PatientProfile>()
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.PatientProfileId, cancellationToken);

        if (!patientExists)
            throw new NotFoundException("Patient not found.");

        if (request.EncounterId.HasValue)
            await EnsureEncounterMatchesPatientAsync(request.EncounterId.Value, request.PatientProfileId, cancellationToken);

        if (await HasActiveAssignmentAsync(bedId, cancellationToken))
            throw new ConflictException("Bed is already assigned to another patient.");

        var patientAlreadyAssigned = await _db.Query<BedAssignment>()
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

        _db.Add<BedAssignment>(assignment);

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
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
        var assignment = await _db.Query<BedAssignment>()
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
        var assignment = await _db.Query<BedAssignment>()
            .FirstOrDefaultAsync(x => x.Id == assignmentId, cancellationToken);

        if (assignment is null)
            throw new NotFoundException("Bed assignment not found.");

        if (assignment.ReleasedAt.HasValue)
            throw new ConflictException("Bed assignment is already released.");

        return await ReleaseAsync(assignment, request, actorUserId, cancellationToken);
    }

    public async Task<IReadOnlyList<BedAssignmentDto>> GetActiveAssignmentsAsync(CancellationToken cancellationToken)
    {
        return await ProjectAssignmentsToDto(_db.Query<BedAssignment>()
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

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetAssignmentDtoAsync(assignment.Id, cancellationToken);
    }

    private async Task EnsureDepartmentExistsAsync(int? departmentId, CancellationToken cancellationToken)
    {
        if (!departmentId.HasValue)
            return;

        var exists = await _db.Query<Department>()
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
        var encounterPatientId = await _db.Query<Encounter>()
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

        var exists = await _db.Query<Bed>()
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
        return await _db.Query<BedAssignment>()
            .AsNoTracking()
            .AnyAsync(x => x.BedId == bedId && x.ReleasedAt == null, cancellationToken);
    }

    private async Task<BedAssignmentDto> GetAssignmentDtoAsync(int id, CancellationToken cancellationToken)
    {
        var assignment = await ProjectAssignmentsToDto(_db.Query<BedAssignment>()
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
                    AssignedByUserName = x.AssignedByUser.Person == null
                        ? x.AssignedByUser.UserName
                        : x.AssignedByUser.Person.FirstName + " " + x.AssignedByUser.Person.LastName,
                    ReleasedAt = x.ReleasedAt,
                    ReleasedByUserId = x.ReleasedByUserId,
                    ReleasedByUserName = x.ReleasedByUser == null
                        ? null
                        : x.ReleasedByUser.Person == null
                            ? x.ReleasedByUser.UserName
                            : x.ReleasedByUser.Person.FirstName + " " + x.ReleasedByUser.Person.LastName,
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

    private static IQueryable<BedDto> ProjectBedsWithActiveAssignmentsToDto(
        IQueryable<Bed> beds,
        IQueryable<BedAssignment> activeAssignments)
    {
        return
            from bed in beds
            join assignment in activeAssignments on bed.Id equals assignment.BedId into assignmentGroup
            from assignment in assignmentGroup.DefaultIfEmpty()
            select new BedDto
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
                    : assignment == null
                        ? BedOccupancyStatus.Available
                        : BedOccupancyStatus.Occupied,
                Notes = bed.Notes,
                CurrentAssignment = assignment == null
                    ? null
                    : new BedAssignmentDto
                    {
                        Id = assignment.Id,
                        BedId = assignment.BedId,
                        BedLabel = bed.Ward + " / " + bed.RoomNumber + " / " + bed.BedNumber,
                        PatientProfileId = assignment.PatientProfileId,
                        PatientName = assignment.PatientProfile.Person.FirstName + " " + assignment.PatientProfile.Person.LastName,
                        PatientNumber = assignment.PatientProfile.PatientNumber,
                        EncounterId = assignment.EncounterId,
                        EncounterNumber = assignment.Encounter == null ? null : assignment.Encounter.EncounterNumber,
                        AssignedAt = assignment.AssignedAt,
                        AssignedByUserId = assignment.AssignedByUserId,
                        AssignedByUserName = assignment.AssignedByUser.Person == null
                            ? assignment.AssignedByUser.UserName
                            : assignment.AssignedByUser.Person.FirstName + " " + assignment.AssignedByUser.Person.LastName,
                        Notes = assignment.Notes,
                        CreatedAt = assignment.CreatedAt,
                        UpdatedAt = assignment.UpdatedAt
                    },
                CreatedAt = bed.CreatedAt,
                UpdatedAt = bed.UpdatedAt
            };
    }

    private static IQueryable<BedPatientDetailsDto> ProjectBedsWithOccupancyToDto(
        IQueryable<Bed> beds,
        IQueryable<BedAssignment> activeAssignments)
    {
        return
            from bed in beds
            join assignment in activeAssignments on bed.Id equals assignment.BedId into assignmentGroup
            from assignment in assignmentGroup.DefaultIfEmpty()
            select new BedPatientDetailsDto
            {
                BedId = bed.Id,
                BedLabel = bed.BedNumber,
                Ward = bed.Ward,
                RoomNumber = bed.RoomNumber,
                Floor = bed.Floor,
                DepartmentName = bed.Department == null ? null : bed.Department.Name,
                IsActive = bed.IsActive,
                Status = !bed.IsActive
                    ? BedOccupancyStatus.Inactive
                    : assignment == null
                        ? BedOccupancyStatus.Available
                        : BedOccupancyStatus.Occupied,
                Notes = bed.Notes,
                PatientProfileId = assignment == null ? null : assignment.PatientProfileId,
                PatientName = assignment == null
                    ? null
                    : assignment.PatientProfile.Person.FirstName + " " + assignment.PatientProfile.Person.LastName,
                PatientNumber = assignment == null ? null : assignment.PatientProfile.PatientNumber,
                EncounterId = assignment == null ? null : assignment.EncounterId,
                EncounterNumber = assignment == null || assignment.Encounter == null ? null : assignment.Encounter.EncounterNumber,
                AssignedAt = assignment == null ? null : assignment.AssignedAt
            };
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
            AssignedByUserName = x.AssignedByUser.Person == null
                ? x.AssignedByUser.UserName
                : x.AssignedByUser.Person.FirstName + " " + x.AssignedByUser.Person.LastName,
            ReleasedAt = x.ReleasedAt,
            ReleasedByUserId = x.ReleasedByUserId,
            ReleasedByUserName = x.ReleasedByUser == null
                ? null
                : x.ReleasedByUser.Person == null
                    ? x.ReleasedByUser.UserName
                    : x.ReleasedByUser.Person.FirstName + " " + x.ReleasedByUser.Person.LastName,
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
