using HMS.Api.Authorization;
using HMS.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/permissions")]
public sealed class AdminPermissionsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public AdminPermissionsController(HmsDbContext db) => _db = db;

    [HttpGet]
    [RequirePermission("Permissions.Read")]
    public async Task<IActionResult> ListPermissions(CancellationToken cancellationToken)
    {
        var items = await _db.Permissions.AsNoTracking()
            .OrderBy(p => p.Name)
            .Select(p => new { p.Id, p.Name, p.Description })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}