using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class DiagnosisService : IDiagnosisService
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "primary",
        "secondary",
        "provisional"
    };

    private readonly HmsDbContext _db;

    public DiagnosisService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<DiagnosisDto> CreateAsync(
        int encounterId,
        CreateDiagnosisDto request,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new UnauthorizedException("Authenticated user is required.");

        var encounter = await _db.Encounters
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == encounterId, cancellationToken);

        if (encounter == null)
            throw new NotFoundException("Encounter not found.");

        if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
            throw new ConflictException("Diagnoses can only be added to an open encounter.");

        var createdByDoctorId = await ResolveDiagnosisDoctorProfileIdAsync(
            encounter.DoctorProfileId,
            actorUserId.Value,
            actorRoles,
            cancellationToken);

        var description = request.Description?.Trim();
        if (string.IsNullOrWhiteSpace(description))
            throw new BadRequestException("Diagnosis description is required.");

        var type = NormalizeOptional(request.Type);
        if (type != null && !AllowedTypes.Contains(type))
            throw new BadRequestException("Diagnosis type must be primary, secondary, or provisional.");

        var now = DateTime.UtcNow;

        var diagnosis = new Diagnosis
        {
            EncounterId = encounterId,
            CreatedByDoctorId = createdByDoctorId,
            IcdCode = NormalizeOptional(request.IcdCode),
            Description = description,
            Type = type?.ToLowerInvariant(),
            Notes = NormalizeOptional(request.Notes),
            DiagnosedAt = request.DiagnosedAt ?? now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.Diagnoses.Add(diagnosis);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(diagnosis.Id, cancellationToken)
            ?? throw new Exception("Diagnosis was created but could not be loaded.");
    }

    public async Task<List<DiagnosisDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken)
    {
        var encounterExists = await _db.Encounters
            .AnyAsync(e => e.Id == encounterId, cancellationToken);

        if (!encounterExists)
            throw new NotFoundException("Encounter not found.");

        return await _db.Diagnoses
            .AsNoTracking()
            .Where(d => d.EncounterId == encounterId)
            .OrderByDescending(d => d.DiagnosedAt)
            .ThenByDescending(d => d.Id)
            .Select(d => new DiagnosisDto
            {
                Id = d.Id,
                EncounterId = d.EncounterId,
                CreatedByDoctorId = d.CreatedByDoctorId,
                CreatedByDoctorName = d.CreatedByDoctor.StaffProfile.Person.FullName,
                IcdCode = d.IcdCode,
                Description = d.Description,
                Type = d.Type,
                Notes = d.Notes,
                DiagnosedAt = d.DiagnosedAt,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<DiagnosisDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Diagnoses
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new DiagnosisDto
            {
                Id = d.Id,
                EncounterId = d.EncounterId,
                CreatedByDoctorId = d.CreatedByDoctorId,
                CreatedByDoctorName = d.CreatedByDoctor.StaffProfile.Person.FullName,
                IcdCode = d.IcdCode,
                Description = d.Description,
                Type = d.Type,
                Notes = d.Notes,
                DiagnosedAt = d.DiagnosedAt,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }

    private async Task<int> ResolveDiagnosisDoctorProfileIdAsync(
        int encounterDoctorProfileId,
        int actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        if (HasRole(roleList, "Admin") || HasRole(roleList, "SuperAdmin"))
            return encounterDoctorProfileId;

        if (!HasRole(roleList, "Doctor"))
            throw new ForbiddenException("Only admins and doctors can add diagnoses.");

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
            throw new ForbiddenException("Only the encounter doctor can add diagnoses.");

        return doctorProfileId.Value;
    }

    private static bool HasRole(IEnumerable<string> roles, string roleName)
    {
        return roles.Any(role => string.Equals(role, roleName, StringComparison.OrdinalIgnoreCase));
    }
}
