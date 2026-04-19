using HMS.Api.Authorization;
using HMS.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/roles")]
public sealed class AdminRolesController : ControllerBase
{
    private readonly HmsDbContext _db;

    public AdminRolesController(HmsDbContext db) => _db = db;

    [HttpGet]
    [RequirePermission("Roles.Read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListRoles(CancellationToken cancellationToken)
    {
        var roles = await _db.Roles.AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.Description })
            .ToListAsync(cancellationToken);

        return Ok(roles);
    }
}
