using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Identity.Infrastructure.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/departments")]
[Authorize(Roles = "Admin,SuperAdmin")]
public sealed class AdminDepartmentsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public AdminDepartmentsController(HmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<DepartmentDto>>> GetDepartments(
        [FromQuery] PaginationQuery pagination,
        [FromQuery] bool all,
        CancellationToken cancellationToken)
    {
        var query = _db.Set<Department>()
            .AsNoTracking()
            .Where(d =>
                string.IsNullOrWhiteSpace(pagination.Search) ||
                d.Name.Contains(pagination.Search) ||
                (d.Description != null && d.Description.Contains(pagination.Search)))
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description
            });

        if (all)
        {
            var items = await query.ToListAsync(cancellationToken);
            return Ok(PaginatedResponse<DepartmentDto>.Create(items, 1, Math.Max(items.Count, 1), items.Count));
        }

        return Ok(await query.ToPaginatedResponseAsync(pagination, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> GetDepartment(int id, CancellationToken cancellationToken)
    {
        var department = await _db.Set<Department>()
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description
            })
            .FirstOrDefaultAsync(cancellationToken);

        return department is null ? NotFound() : Ok(department);
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment(
        [FromBody] CreateDepartmentDto request,
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
            CreatedById = CurrentUserId(),
            UpdatedById = CurrentUserId()
        };

        _db.Set<Department>().Add(department);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description
        };

        return CreatedAtAction(nameof(GetDepartment), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> UpdateDepartment(
        int id,
        [FromBody] UpdateDepartmentDto request,
        CancellationToken cancellationToken)
    {
        var department = await _db.Set<Department>()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (department is null)
            return NotFound();

        var name = NormalizeRequired(request.Name);
        await EnsureNameIsAvailableAsync(id, name, cancellationToken);

        department.Name = name;
        department.Description = NormalizeOptional(request.Description);
        department.UpdatedAt = DateTime.UtcNow;
        department.UpdatedById = CurrentUserId();

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDepartment(int id, CancellationToken cancellationToken)
    {
        var department = await _db.Set<Department>()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (department is null)
            return NotFound();

        if (await HasReferencesAsync(id, cancellationToken))
            return Conflict(new { error = "Department is in use by staff, beds, or appointments and cannot be deleted." });

        _db.Set<Department>().Remove(department);
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task EnsureNameIsAvailableAsync(int? currentId, string name, CancellationToken cancellationToken)
    {
        var exists = await _db.Set<Department>()
            .AsNoTracking()
            .AnyAsync(d =>
                (!currentId.HasValue || d.Id != currentId.Value) &&
                d.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (exists)
            throw new ConflictException("A department with this name already exists.");
    }

    private async Task<bool> HasReferencesAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.StaffProfiles.AsNoTracking().AnyAsync(x => x.DepartmentId == id, cancellationToken)
            || await _db.Beds.AsNoTracking().AnyAsync(x => x.DepartmentId == id, cancellationToken)
            || await _db.Set<Appointment>().AsNoTracking().AnyAsync(x => x.DepartmentId == id, cancellationToken);
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(value, out var id) ? id : null;
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
}
