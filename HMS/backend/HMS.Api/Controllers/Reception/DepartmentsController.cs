using HMS.Api.Authorization;
using HMS.Contracts.Identity;
using HMS.Persistence;
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
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartments(
        CancellationToken cancellationToken)
    {
        var list = await _db.Set<HMS.Domain.Entities.Department>()
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
            })
            .ToListAsync(cancellationToken);

        return Ok(list);
    }
}
