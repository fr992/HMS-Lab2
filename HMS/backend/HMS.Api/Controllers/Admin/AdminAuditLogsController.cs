using HMS.Api.Authorization;
using HMS.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/audit-logs")]
public sealed class AdminAuditLogsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public AdminAuditLogsController(HmsDbContext db) => _db = db;

    [HttpGet]
    [RequirePermission("AuditLogs.Read")]
    public async Task<IActionResult> Query(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        skip = Math.Max(0, skip);

        var query = _db.AuditLogs.AsNoTracking()
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(a => a.CreatedAt >= from.Value.UtcDateTime);
        if (to.HasValue)
            query = query.Where(a => a.CreatedAt <= to.Value.UtcDateTime);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip(skip)
            .Take(take)
            .Select(a => new
            {
                a.Id,
                a.UserId,
                UserName = a.User != null ? a.User.UserName : null,
                a.Action,
                a.Entity,
                a.EntityId,
                a.OldValue,
                a.NewValue,
                a.IpAddress,
                a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new { totalCount, skip, take, items });
    }
}