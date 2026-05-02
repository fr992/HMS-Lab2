using HMS.Application.Abstractions.Identity;
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
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new InvalidOperationException("Authenticated user is required.");

        var encounter = await _db.Encounters
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == encounterId, cancellationToken);

        if (encounter == null)
            throw new InvalidOperationException("Encounter not found.");

        if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
            throw new InvalidOperationException("Diagnoses can only be added to an open encounter.");

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
            throw new InvalidOperationException("Only the encounter doctor can add diagnoses.");

        var description = request.Description?.Trim();
        if (string.IsNullOrWhiteSpace(description))
            throw new InvalidOperationException("Diagnosis description is required.");

        var type = NormalizeOptional(request.Type);
        if (type != null && !AllowedTypes.Contains(type))
            throw new InvalidOperationException("Diagnosis type must be primary, secondary, or provisional.");

        var now = DateTime.UtcNow;

        var diagnosis = new Diagnosis
        {
            EncounterId = encounterId,
            CreatedByDoctorId = doctor.Id,
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
            ?? throw new InvalidOperationException("Diagnosis created but could not be loaded.");
    }

    public async Task<List<DiagnosisDto>> GetByEncounterAsync(
        int encounterId,
        CancellationToken cancellationToken)
    {
        var encounterExists = await _db.Encounters
            .AnyAsync(e => e.Id == encounterId, cancellationToken);

        if (!encounterExists)
            throw new InvalidOperationException("Encounter not found.");

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
}
