using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class NurseTaskService : INurseTaskService
{
    private readonly HmsDbContext _db;

    public NurseTaskService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<NurseTaskDto> CreateAsync(
        CreateNurseTaskRequestDto request,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var encounterDoctorId = await _db.Encounters
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

        _db.NurseTasks.Add(task);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<IReadOnlyList<NurseTaskDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken)
    {
        return await ProjectToDto(_db.NurseTasks
                .AsNoTracking()
                .Where(x => x.EncounterId == encounterId)
                .OrderByDescending(x => x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<NurseTaskDto>> GetMyTasksAsync(
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (IsAdmin(actorRoles))
        {
            return await ProjectToDto(_db.NurseTasks
                    .AsNoTracking()
                    .OrderBy(x => x.DueAt ?? DateTime.MaxValue)
                    .ThenByDescending(x => x.CreatedAt))
                .ToListAsync(cancellationToken);
        }

        if (HasRole(actorRoles, "Doctor"))
        {
            var doctorId = await _db.DoctorProfiles
                .AsNoTracking()
                .Where(x => x.IsActive && x.StaffProfile.Person.UserId == actorUserId)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!doctorId.HasValue)
                throw new ForbiddenException("Current user is not linked to an active doctor profile.");

            return await ProjectToDto(_db.NurseTasks
                    .AsNoTracking()
                    .Where(x => x.AssignedByDoctorId == doctorId.Value)
                    .OrderBy(x => x.DueAt ?? DateTime.MaxValue)
                    .ThenByDescending(x => x.CreatedAt))
                .ToListAsync(cancellationToken);
        }

        var nurseId = await _db.NurseProfiles
            .AsNoTracking()
            .Where(x => x.StaffProfile.Person.UserId == actorUserId)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!nurseId.HasValue)
            throw new ForbiddenException("Current user is not linked to a nurse profile.");

        return await ProjectToDto(_db.NurseTasks
                .AsNoTracking()
                .Where(x => x.AssignedToNurseId == nurseId.Value)
                .OrderBy(x => x.DueAt ?? DateTime.MaxValue)
                .ThenByDescending(x => x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<NurseTaskDto> UpdateAsync(
        int id,
        UpdateNurseTaskRequestDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var task = await _db.NurseTasks
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

        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<NurseTaskDto> CompleteAsync(
        int id,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var task = await _db.NurseTasks
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

        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    private async Task EnsureActiveNurseAsync(int nurseProfileId, CancellationToken cancellationToken)
    {
        var nurseExists = await _db.NurseProfiles
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

        var doctorId = await _db.DoctorProfiles
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
}
