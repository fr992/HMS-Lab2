using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Application.Exceptions;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class MedicationsService : IMedicationsService
{
    private readonly HmsDbContext _db;

    public MedicationsService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<MedicationDto> CreateAsync(
        CreateMedicationDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(name))
            throw new BadRequestException("Medication name is required.");

        var exists = await _db.Medications
            .AnyAsync(m => m.Name == name, cancellationToken);

        if (exists)
            throw new ConflictException("Medication already exists.");

        var now = DateTime.UtcNow;

        var medication = new Medication
        {
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim(),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.Medications.Add(medication);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(medication);
    }

    public async Task<MedicationDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Medications
            .AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new MedicationDto
            {
                Id = m.Id,
                Name = m.Name,
                Description = m.Description,
                IsActive = m.IsActive,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<MedicationDto>> GetAllAsync(
        bool? isActive,
        CancellationToken cancellationToken)
    {
        var query = _db.Medications
            .AsNoTracking()
            .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(m => m.IsActive == isActive.Value);
        }

        return await query
            .OrderBy(m => m.Name)
            .Select(m => new MedicationDto
            {
                Id = m.Id,
                Name = m.Name,
                Description = m.Description,
                IsActive = m.IsActive,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<MedicationDto> UpdateAsync(
        int id,
        UpdateMedicationDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var medication = await _db.Medications
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (medication == null)
            throw new NotFoundException("Medication not found.");

        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(name))
            throw new BadRequestException("Medication name is required.");

        var exists = await _db.Medications
            .AnyAsync(m => m.Id != id && m.Name == name, cancellationToken);

        if (exists)
            throw new ConflictException("Medication already exists.");

        medication.Name = name;
        medication.Description = string.IsNullOrWhiteSpace(request.Description)
            ? null
            : request.Description.Trim();
        medication.IsActive = request.IsActive;
        medication.UpdatedAt = DateTime.UtcNow;
        medication.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return Map(medication);
    }

    public async Task DeleteAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var medication = await _db.Medications
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (medication == null)
            throw new NotFoundException("Medication not found.");

        medication.IsActive = false;
        medication.UpdatedAt = DateTime.UtcNow;
        medication.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static MedicationDto Map(Medication medication)
    {
        return new MedicationDto
        {
            Id = medication.Id,
            Name = medication.Name,
            Description = medication.Description,
            IsActive = medication.IsActive,
            CreatedAt = medication.CreatedAt,
            UpdatedAt = medication.UpdatedAt
        };
    }
}
