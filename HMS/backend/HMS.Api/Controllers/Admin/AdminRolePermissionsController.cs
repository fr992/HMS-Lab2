using HMS.Api.Authorization;
using HMS.Api.Logging;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

public sealed class SetRolePermissionsRequest
{
    public List<string> PermissionNames { get; set; } = new();
}

[ApiController]
[Route("api/admin/role-permissions")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminRolePermissionsController : ControllerBase
{
    private readonly HmsDbContext _db;
    private readonly ILogger<AdminRolePermissionsController> _logger;

    public AdminRolePermissionsController(HmsDbContext db, ILogger<AdminRolePermissionsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("{roleId:int}")]
    [RequirePermission("RolePermissions.Manage")]
    public async Task<IActionResult> GetForRole(int roleId, CancellationToken cancellationToken)
    {
        if (!await _db.Roles.AnyAsync(r => r.Id == roleId, cancellationToken))
            return NotFound(new { error = "Role not found." });

        var names = await _db.RolePermissions.AsNoTracking()
            .Where(rp => rp.RoleId == roleId)
            .Join(_db.Permissions.AsNoTracking(), rp => rp.PermissionId, p => p.Id, (rp, p) => p.Name)
            .OrderBy(n => n)
            .ToListAsync(cancellationToken);

        return Ok(new { roleId, permissionNames = names });
    }

    [HttpPut("{roleId:int}")]
    [RequirePermission("RolePermissions.Manage")]
    public async Task<IActionResult> SetRolePermissions(
        int roleId,
        [FromBody] SetRolePermissionsRequest body,
        CancellationToken cancellationToken)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);
        if (role is null)
            return NotFound(new { error = "Role not found." });

        if (role.Name == "SuperAdmin")
            return BadRequest(new { error = "The SuperAdmin role is display-only and cannot be edited." });

        var names = (body.PermissionNames ?? new List<string>())
            .Select(n => n.Trim())
            .Where(n => n.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var permissions = await _db.Permissions.AsNoTracking()
            .Where(p => names.Contains(p.Name))
            .ToListAsync(cancellationToken);

        if (permissions.Count != names.Count)
        {
            var found = permissions.Select(p => p.Name).ToHashSet(StringComparer.Ordinal);
            var missing = names.Where(n => !found.Contains(n)).ToList();
            return BadRequest(new { error = "Unknown permission name(s).", missing });
        }

        var existing = await _db.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync(cancellationToken);

        _db.RolePermissions.RemoveRange(existing);

        var now = DateTime.UtcNow;
        foreach (var p in permissions)
        {
            _db.RolePermissions.Add(new RolePermission
            {
                RoleId = roleId,
                PermissionId = p.Id,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        using (BeginRolePermissionsScope(roleId))
        {
            _logger.LogInformation(
                "IAM role permissions updated by user {ActorUserId}. Role {RoleId}; permission count: {PermissionCount}.",
                CurrentUserId(),
                roleId,
                permissions.Count);
        }

        return NoContent();
    }

    private IDisposable? BeginRolePermissionsScope(int roleId)
    {
        return _logger.BeginScope(new Dictionary<string, object?>
        {
            ["Signal"] = LogSignals.IAM,
            ["IamEvent"] = "RolePermissionsUpdated",
            ["ActorUserId"] = CurrentUserId(),
            ["RoleId"] = roleId,
            ["TraceId"] = HttpContext.TraceIdentifier,
            ["RequestPath"] = HttpContext.Request.Path.Value,
            ["RemoteIpAddress"] = HttpContext.Connection.RemoteIpAddress?.ToString()
        });
    }

    private string? CurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
    }
}
