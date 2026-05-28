using HMS.Api.Authorization;
using HMS.Api.Logging;
using HMS.Contracts.Identity;
using Identity.Infrastructure.Common;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

public sealed class RoleUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> PermissionNames { get; set; } = new();
}

[ApiController]
[Route("api/admin/roles")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminRolesController : ControllerBase
{
    private readonly HmsDbContext _db;
    private readonly ILogger<AdminRolesController> _logger;

    public AdminRolesController(HmsDbContext db, ILogger<AdminRolesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    [RequirePermission("Roles.Read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponse<object>>> ListRoles(
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = _db.Roles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(r => r.Name.Contains(search));
        }

        var roles = await query
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Description,
                PermissionNames = r.RolePermissions
                    .Select(rp => rp.Permission.Name)
                    .OrderBy(n => n)
                    .ToList()
            })
            .ToPaginatedResponseAsync(pagination, cancellationToken);

        return Ok(roles);
    }

    [HttpPost]
    [RequirePermission("RolePermissions.Manage")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateRole(
        [FromBody] RoleUpsertRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Role name is required." });

        if (await _db.Roles.AnyAsync(r => r.Name == name, cancellationToken))
            return BadRequest(new { error = "Role name is already used." });

        var (permissions, error) = await GetPermissionsAsync(request.PermissionNames, cancellationToken);
        if (error is not null)
            return BadRequest(error);

        var now = DateTime.UtcNow;
        var role = new Role
        {
            Name = name,
            Description = request.Description?.Trim() ?? string.Empty,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Roles.Add(role);
        await _db.SaveChangesAsync(cancellationToken);

        AddRolePermissions(role.Id, permissions, now);
        await _db.SaveChangesAsync(cancellationToken);

        using (BeginRoleManagementScope("RoleCreated", role.Id))
        {
            _logger.LogInformation(
                "IAM role {RoleId} created by user {ActorUserId}. Role name: {RoleName}; permission count: {PermissionCount}.",
                role.Id,
                CurrentUserId(),
                role.Name,
                permissions.Count);
        }

        return Created($"/api/admin/roles/{role.Id}", new
        {
            role.Id,
            role.Name,
            role.Description,
            PermissionNames = permissions.Select(p => p.Name).OrderBy(n => n).ToList()
        });
    }

    [HttpPut("{id:int}")]
    [RequirePermission("RolePermissions.Manage")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRole(
        int id,
        [FromBody] RoleUpsertRequest request,
        CancellationToken cancellationToken)
    {
        var role = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role is null)
            return NotFound(new { error = "Role not found." });

        if (role.Name == "SuperAdmin")
            return BadRequest(new { error = "The SuperAdmin role is display-only and cannot be edited." });

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Role name is required." });

        if (role.Name == "SuperAdmin" && !name.Equals("SuperAdmin", StringComparison.Ordinal))
            return BadRequest(new { error = "The SuperAdmin role cannot be renamed." });

        if (await _db.Roles.AnyAsync(r => r.Id != id && r.Name == name, cancellationToken))
            return BadRequest(new { error = "Role name is already used." });

        var (permissions, error) = await GetPermissionsAsync(request.PermissionNames, cancellationToken);
        if (error is not null)
            return BadRequest(error);

        var now = DateTime.UtcNow;
        role.Name = name;
        role.Description = request.Description?.Trim() ?? string.Empty;
        role.UpdatedAt = now;

        _db.RolePermissions.RemoveRange(role.RolePermissions);
        AddRolePermissions(role.Id, permissions, now);
        await _db.SaveChangesAsync(cancellationToken);

        using (BeginRoleManagementScope("RoleUpdated", role.Id))
        {
            _logger.LogInformation(
                "IAM role {RoleId} updated by user {ActorUserId}. Role name: {RoleName}; permission count: {PermissionCount}.",
                role.Id,
                CurrentUserId(),
                role.Name,
                permissions.Count);
        }

        return Ok(new
        {
            role.Id,
            role.Name,
            role.Description,
            PermissionNames = permissions.Select(p => p.Name).OrderBy(n => n).ToList()
        });
    }

    [HttpDelete("{id:int}")]
    [RequirePermission("RolePermissions.Manage")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRole(int id, CancellationToken cancellationToken)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (role is null)
            return NotFound(new { error = "Role not found." });

        if (role.Name == "SuperAdmin")
            return BadRequest(new { error = "The SuperAdmin role cannot be deleted." });

        if (await _db.UserRoles.AnyAsync(ur => ur.RoleId == id, cancellationToken))
            return BadRequest(new { error = "Role is assigned to users and cannot be deleted." });

        _db.Roles.Remove(role);
        await _db.SaveChangesAsync(cancellationToken);

        using (BeginRoleManagementScope("RoleDeleted", id))
        {
            _logger.LogWarning(
                "IAM role {RoleId} deleted by user {ActorUserId}. Role name: {RoleName}.",
                id,
                CurrentUserId(),
                role.Name);
        }

        return NoContent();
    }

    private async Task<(List<Permission> permissions, object? error)> GetPermissionsAsync(
        IReadOnlyCollection<string>? permissionNames,
        CancellationToken cancellationToken)
    {
        var names = (permissionNames ?? [])
            .Select(n => n.Trim())
            .Where(n => n.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (names.Count == 0)
            return ([], null);

        var permissions = await _db.Permissions
            .Where(p => names.Contains(p.Name))
            .ToListAsync(cancellationToken);

        if (permissions.Count == names.Count)
            return (permissions, null);

        var found = permissions.Select(p => p.Name).ToHashSet(StringComparer.Ordinal);
        var missing = names.Where(n => !found.Contains(n)).ToList();
        return ([], new { error = "Unknown permission name(s).", missing });
    }

    private void AddRolePermissions(int roleId, IEnumerable<Permission> permissions, DateTime timestamp)
    {
        foreach (var permission in permissions)
        {
            _db.RolePermissions.Add(new RolePermission
            {
                RoleId = roleId,
                PermissionId = permission.Id,
                CreatedAt = timestamp,
                UpdatedAt = timestamp
            });
        }
    }

    private IDisposable? BeginRoleManagementScope(string iamEvent, int roleId)
    {
        return _logger.BeginScope(new Dictionary<string, object?>
        {
            ["Signal"] = LogSignals.IAM,
            ["IamEvent"] = iamEvent,
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
