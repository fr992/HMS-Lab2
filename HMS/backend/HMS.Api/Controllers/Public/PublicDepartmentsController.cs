using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Infrastructure.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/departments")]
public sealed class PublicDepartmentsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public PublicDepartmentsController(HmsDbContext db)
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
            return Ok(PaginatedResponse<DepartmentDto>.Create(items, 1, items.Count, items.Count));
        }

        return Ok(await query.ToPaginatedResponseAsync(pagination, cancellationToken));
    }
}
