using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class DepartmentService : IDepartmentService
{
    private readonly IRepository<Department> _departments;
    private readonly IHmsRepository _db;
    private readonly IUnitOfWork _unitOfWork;

    public DepartmentService(
        IRepository<Department> departments,
        IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _departments = departments;
        _db = db;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedResponse<DepartmentDto>> GetDepartmentsAsync(
        PaginationQuery pagination,
        bool all,
        CancellationToken cancellationToken)
    {
        var query = _departments.Query()
            .Where(department =>
                string.IsNullOrWhiteSpace(pagination.Search) ||
                department.Name.Contains(pagination.Search) ||
                (department.Description != null && department.Description.Contains(pagination.Search)))
            .OrderBy(department => department.Name)
            .Select(department => new DepartmentDto
            {
                Id = department.Id,
                Name = department.Name,
                Description = department.Description
            });

        if (!all)
            return await query.ToPaginatedResponseAsync(pagination, cancellationToken);

        var items = await query.ToListAsync(cancellationToken);
        return PaginatedResponse<DepartmentDto>.Create(
            items,
            page: 1,
            pageSize: Math.Max(items.Count, 1),
            totalCount: items.Count);
    }

    public async Task<DepartmentDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _departments.Query()
            .Where(department => department.Id == id)
            .Select(department => new DepartmentDto
            {
                Id = department.Id,
                Name = department.Name,
                Description = department.Description
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<DepartmentDto> CreateAsync(
        CreateDepartmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var name = NormalizeRequired(request.Name);
        await EnsureNameIsAvailableAsync(null, name, cancellationToken);

        var now = DateTime.UtcNow;
        var department = new Department
        {
            Name = name,
            Description = NormalizeOptional(request.Description),
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        await _departments.AddAsync(department, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(department);
    }

    public async Task<DepartmentDto?> UpdateAsync(
        int id,
        UpdateDepartmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var department = await _departments.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (department is null)
            return null;

        var name = NormalizeRequired(request.Name);
        await EnsureNameIsAvailableAsync(id, name, cancellationToken);

        department.Name = name;
        department.Description = NormalizeOptional(request.Description);
        department.UpdatedAt = DateTime.UtcNow;
        department.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(department);
    }

    public async Task<DeleteDepartmentResult> DeleteAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var department = await _departments.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (department is null)
            return DeleteDepartmentResult.NotFound;

        if (await HasReferencesAsync(id, cancellationToken))
            return DeleteDepartmentResult.InUse;

        _departments.Remove(department);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return DeleteDepartmentResult.Deleted;
    }

    private async Task EnsureNameIsAvailableAsync(
        int? currentId,
        string name,
        CancellationToken cancellationToken)
    {
        var normalized = name.ToLower();
        var exists = await _departments.Query()
            .AnyAsync(department =>
                (!currentId.HasValue || department.Id != currentId.Value) &&
                department.Name.ToLower() == normalized,
                cancellationToken);

        if (exists)
            throw new ConflictException("A department with this name already exists.");
    }

    private async Task<bool> HasReferencesAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Query<StaffProfile>().AnyAsync(profile => profile.DepartmentId == id, cancellationToken)
            || await _db.Query<Bed>().AnyAsync(bed => bed.DepartmentId == id, cancellationToken)
            || await _db.Query<Appointment>().AnyAsync(appointment => appointment.DepartmentId == id, cancellationToken);
    }

    private static string NormalizeRequired(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new BadRequestException("Department name is required.");

        return value.Trim();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static DepartmentDto Map(Department department)
    {
        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description
        };
    }
}
