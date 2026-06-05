using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Identity.Infrastructure.Services;

public sealed class NurseTaskService : INurseTaskService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationService _notificationService;
    private readonly ILogger<NurseTaskService> _logger;

    public NurseTaskService(
        IHmsRepository db,
        IUnitOfWork unitOfWork,
        INotificationService notificationService,
        ILogger<NurseTaskService> logger)
    {
        _db = db;

        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<NurseTaskDto> CreateAsync(
        CreateNurseTaskRequestDto request,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var encounterDoctorId = await _db.Query<Encounter>()
            .AsNoTracking()
            .Where(x => x.Id == request.EncounterId)
            .Select(x => (int?)x.DoctorProfileId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!encounterDoctorId.HasValue)
            throw new NotFoundException("Encounter not found.");

        var assignedByDoctorId = await ResolveAssignedByDoctorIdAsync(
            encounterDoctorId.Value,
            actorUserId,
            actorRoles,
            cancellationToken);

        if (request.AssignedToNurseId.HasValue)
            await EnsureActiveNurseAsync(request.AssignedToNurseId.Value, cancellationToken);

        var now = DateTime.UtcNow;

        var task = new NurseTask
        {
            EncounterId = request.EncounterId,
            AssignedByDoctorId = assignedByDoctorId,
            AssignedToNurseId = request.AssignedToNurseId,
            Type = NormalizeRequired(request.Type, "Nurse task type is required."),
            Priority = NormalizeOptional(request.Priority),
            Status = NurseTaskStatus.Pending,
            Notes = NormalizeOptional(request.Notes),
            DueAt = request.DueAt,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Add<NurseTask>(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await NotifyAssignedNurseAsync(task.Id, cancellationToken);

        return ToDto(task);
    }

    public async Task<IReadOnlyList<NurseTaskDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken)
    {
        return await ProjectToDto(_db.Query<NurseTask>()
                .AsNoTracking()
                .Where(x => x.EncounterId == encounterId)
                .OrderByDescending(x => x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<PaginatedResponse<NurseTaskDto>> GetMyTasksAsync(
        int actorUserId,
        IEnumerable<string> actorRoles,
        string? status,
        string? priority,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        IQueryable<NurseTask> query;

        if (IsAdmin(actorRoles))
        {
            query = _db.Query<NurseTask>().AsNoTracking();
        }
        else if (HasRole(actorRoles, "Doctor"))
        {
            var doctorId = await _db.Query<DoctorProfile>()
                .AsNoTracking()
                .Where(x => x.IsActive && x.StaffProfile.Person.UserId == actorUserId)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!doctorId.HasValue)
                throw new ForbiddenException("Current user is not linked to an active doctor profile.");

            query = _db.Query<NurseTask>()
                    .AsNoTracking()
                    .Where(x => x.AssignedByDoctorId == doctorId.Value);
        }
        else
        {
            var nurseId = await _db.Query<NurseProfile>()
                .AsNoTracking()
                .Where(x => x.StaffProfile.Person.UserId == actorUserId)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!nurseId.HasValue)
                throw new ForbiddenException("Current user is not linked to a nurse profile.");

            query = _db.Query<NurseTask>()
                .AsNoTracking()
                .Where(x => x.AssignedToNurseId == nurseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim();
            query = query.Where(x => x.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(priority) && !string.Equals(priority, "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedPriority = priority.Trim();
            query = query.Where(x => x.Priority == normalizedPriority);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(x =>
                x.Type.Contains(search) ||
                (x.Priority != null && x.Priority.Contains(search)) ||
                x.Status.Contains(search) ||
                (x.Notes != null && x.Notes.Contains(search)) ||
                x.Encounter.EncounterNumber.Contains(search) ||
                x.Encounter.PatientProfile.Person.FirstName.Contains(search) ||
                x.Encounter.PatientProfile.Person.LastName.Contains(search) ||
                (x.AssignedToNurse != null &&
                    (x.AssignedToNurse.StaffProfile.Person.FirstName + " " + x.AssignedToNurse.StaffProfile.Person.LastName).Contains(search)) ||
                (x.AssignedByDoctor.StaffProfile.Person.FirstName + " " + x.AssignedByDoctor.StaffProfile.Person.LastName).Contains(search));
        }

        return await ProjectToDto(query
                .OrderBy(x => x.DueAt ?? DateTime.MaxValue)
                .ThenByDescending(x => x.CreatedAt))
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<NurseTaskDto> UpdateAsync(
        int id,
        UpdateNurseTaskRequestDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var task = await _db.Query<NurseTask>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (task is null)
            throw new NotFoundException("Nurse task not found.");

        if (task.Status == NurseTaskStatus.Completed)
            throw new ConflictException("Completed nurse tasks cannot be updated.");

        if (request.AssignedToNurseId.HasValue)
            await EnsureActiveNurseAsync(request.AssignedToNurseId.Value, cancellationToken);

        task.AssignedToNurseId = request.AssignedToNurseId;
        task.Type = NormalizeRequired(request.Type, "Nurse task type is required.");
        task.Priority = NormalizeOptional(request.Priority);
        task.Notes = NormalizeOptional(request.Notes);
        task.DueAt = request.DueAt;
        task.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<NurseTaskDto> CompleteAsync(
        int id,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var task = await _db.Query<NurseTask>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (task is null)
            throw new NotFoundException("Nurse task not found.");

        if (task.Status == NurseTaskStatus.Completed)
            throw new ConflictException("Nurse task is already completed.");

        var now = DateTime.UtcNow;

        task.Status = NurseTaskStatus.Completed;
        task.CompletedAt = now;
        task.CompletedByUserId = actorUserId;
        task.UpdatedAt = now;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    private async Task EnsureActiveNurseAsync(int nurseProfileId, CancellationToken cancellationToken)
    {
        var nurseExists = await _db.Query<NurseProfile>()
            .AsNoTracking()
            .AnyAsync(x => x.Id == nurseProfileId && x.IsActive, cancellationToken);

        if (!nurseExists)
            throw new NotFoundException("Assigned nurse not found or inactive.");
    }

    private async Task<int> ResolveAssignedByDoctorIdAsync(
        int encounterDoctorId,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        if (IsAdmin(roleList))
            return encounterDoctorId;

        if (!HasRole(roleList, "Doctor"))
            throw new ForbiddenException("Only doctors or admins can assign nurse tasks.");

        var doctorId = await _db.Query<DoctorProfile>()
            .AsNoTracking()
            .Where(x => x.IsActive && x.StaffProfile.Person.UserId == actorUserId)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!doctorId.HasValue)
            throw new ForbiddenException("Current user is not linked to an active doctor profile.");

        if (doctorId.Value != encounterDoctorId)
            throw new ForbiddenException("Only the encounter doctor can assign nurse tasks.");

        return doctorId.Value;
    }

    private static bool IsAdmin(IEnumerable<string> roles)
    {
        return HasRole(roles, "Admin") || HasRole(roles, "SuperAdmin");
    }

    private static bool HasRole(IEnumerable<string> roles, string roleName)
    {
        return roles.Any(role => string.Equals(role, roleName, StringComparison.OrdinalIgnoreCase));
    }

    private static IQueryable<NurseTaskDto> ProjectToDto(IQueryable<NurseTask> query)
    {
        return query.Select(task => new NurseTaskDto
        {
            Id = task.Id,
            EncounterId = task.EncounterId,
            EncounterNumber = task.Encounter.EncounterNumber,
            PatientName = task.Encounter.PatientProfile.Person.FirstName + " " + task.Encounter.PatientProfile.Person.LastName,
            AssignedByDoctorId = task.AssignedByDoctorId,
            AssignedByDoctorName = task.AssignedByDoctor.StaffProfile.Person.FirstName + " " + task.AssignedByDoctor.StaffProfile.Person.LastName,
            AssignedToNurseId = task.AssignedToNurseId,
            AssignedToNurseName = task.AssignedToNurse == null
                ? null
                : task.AssignedToNurse.StaffProfile.Person.FirstName + " " + task.AssignedToNurse.StaffProfile.Person.LastName,
            Type = task.Type,
            Priority = task.Priority,
            Status = task.Status,
            Notes = task.Notes,
            DueAt = task.DueAt,
            CreatedAt = task.CreatedAt,
            CompletedAt = task.CompletedAt,
            CompletedByUserId = task.CompletedByUserId,
            UpdatedAt = task.UpdatedAt
        });
    }

    private static NurseTaskDto ToDto(NurseTask task)
    {
        return new NurseTaskDto
        {
            Id = task.Id,
            EncounterId = task.EncounterId,
            AssignedByDoctorId = task.AssignedByDoctorId,
            AssignedToNurseId = task.AssignedToNurseId,
            Type = task.Type,
            Priority = task.Priority,
            Status = task.Status,
            Notes = task.Notes,
            DueAt = task.DueAt,
            CreatedAt = task.CreatedAt,
            CompletedAt = task.CompletedAt,
            CompletedByUserId = task.CompletedByUserId,
            UpdatedAt = task.UpdatedAt
        };
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

    private async Task NotifyAssignedNurseAsync(int nurseTaskId, CancellationToken cancellationToken)
    {
        var notificationData = await _db.Query<NurseTask>()
            .AsNoTracking()
            .Where(task => task.Id == nurseTaskId && task.AssignedToNurseId.HasValue)
            .Select(task => new
            {
                task.Id,
                task.Type,
                NurseUserId = task.AssignedToNurse!.StaffProfile.Person.UserId,
                PatientName = task.Encounter.PatientProfile.Person.FirstName + " " + task.Encounter.PatientProfile.Person.LastName
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (notificationData?.NurseUserId is null)
            return;

        await TryCreateNotificationAsync(
            new CreateNotificationRequestDto
            {
                UserId = notificationData.NurseUserId.Value,
                Type = "nurse_task",
                Title = "New nurse task assigned",
                Message = $"New nurse task assigned: {notificationData.Type} for {notificationData.PatientName}.",
                RelatedEntityType = "NurseTask",
                RelatedEntityId = notificationData.Id.ToString()
            },
            cancellationToken);
    }

    private async Task TryCreateNotificationAsync(
        CreateNotificationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _notificationService.CreateAsync(request, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(
                exception,
                "Failed to create notification for user {UserId} related to {RelatedEntityType} {RelatedEntityId}.",
                request.UserId,
                request.RelatedEntityType,
                request.RelatedEntityId);
        }
    }
}
