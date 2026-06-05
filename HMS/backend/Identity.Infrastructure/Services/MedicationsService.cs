using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class MedicationsService : IMedicationsService
{
    private readonly IRepository<Medication> _medications;
    private readonly IUnitOfWork _unitOfWork;

    public MedicationsService(
        IRepository<Medication> medications,
        IUnitOfWork unitOfWork)
    {
        _medications = medications;
        _unitOfWork = unitOfWork;
    }

    public async Task<MedicationDto> CreateAsync(
        CreateMedicationDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(name))
            throw new BadRequestException("Medication name is required.");

        var exists = await _medications.AnyAsync(
            medication => medication.Name == name,
            cancellationToken);

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

        await _medications.AddAsync(medication, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(medication);
    }

    public async Task<MedicationDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _medications.Query()
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

    public async Task<PaginatedResponse<MedicationDto>> GetAllAsync(
        bool? isActive,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = _medications.Query();

        if (isActive.HasValue)
        {
            query = query.Where(m => m.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(m =>
                m.Name.Contains(search)
                || (m.Description != null && m.Description.Contains(search)));
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
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<MedicationDto> UpdateAsync(
        int id,
        UpdateMedicationDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var medication = await _medications.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (medication == null)
            throw new NotFoundException("Medication not found.");

        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(name))
            throw new BadRequestException("Medication name is required.");

        var exists = await _medications.AnyAsync(
            medication => medication.Id != id && medication.Name == name,
            cancellationToken);

        if (exists)
            throw new ConflictException("Medication already exists.");

        medication.Name = name;
        medication.Description = string.IsNullOrWhiteSpace(request.Description)
            ? null
            : request.Description.Trim();
        medication.IsActive = request.IsActive;
        medication.UpdatedAt = DateTime.UtcNow;
        medication.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(medication);
    }

    public async Task DeleteAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var medication = await _medications.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (medication == null)
            throw new NotFoundException("Medication not found.");

        medication.IsActive = false;
        medication.UpdatedAt = DateTime.UtcNow;
        medication.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
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
