using HMS.Api.Authorization;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Infrastructure.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/departments")]
[Authorize]
public sealed class DepartmentsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public DepartmentsController(HmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<PaginatedResponse<DepartmentDto>>> GetDepartments(
        [FromQuery] PaginationQuery pagination,
        [FromQuery] bool all,
        CancellationToken cancellationToken)
    {
        var query = _db.Set<HMS.Domain.Entities.Department>()
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
                Description = d.Description,
            });

        if (all)
        {
            var items = await query.ToListAsync(cancellationToken);
            return Ok(PaginatedResponse<DepartmentDto>.Create(items, 1, Math.Max(items.Count, 1), items.Count));
        }

        return Ok(await query.ToPaginatedResponseAsync(pagination, cancellationToken));
    }
}
