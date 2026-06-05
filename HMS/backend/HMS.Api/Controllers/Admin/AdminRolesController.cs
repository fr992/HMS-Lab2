using HMS.Api.Authorization;
using HMS.Api.Logging;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/roles")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminRolesController : ControllerBase
{
    private readonly IRoleAdministrationService _roles;
    private readonly ILogger<AdminRolesController> _logger;

    public AdminRolesController(
        IRoleAdministrationService roles,
        ILogger<AdminRolesController> logger)
    {
        _roles = roles;
        _logger = logger;
    }

    [HttpGet]
    [RequirePermission("Roles.Read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponse<RoleDto>>> ListRoles(
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        return Ok(await _roles.ListRolesAsync(pagination, cancellationToken));
    }

    [HttpPost]
    [RequirePermission("RolePermissions.Manage")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateRole(
        [FromBody] RoleUpsertDto request,
        CancellationToken cancellationToken)
    {
        var result = await _roles.CreateRoleAsync(request, cancellationToken);
        if (result.Failure is not null)
            return Failure(result.Failure);

        var role = result.Value!;
        using (BeginRoleManagementScope("RoleCreated", role.Id))
        {
            _logger.LogInformation(
                "IAM role {RoleId} created by user {ActorUserId}. Role name: {RoleName}; permission count: {PermissionCount}.",
                role.Id,
                CurrentUserId(),
                role.Name,
                role.PermissionNames.Count);
        }

        return Created($"/api/admin/roles/{role.Id}", role);
    }

    [HttpPut("{id:int}")]
    [RequirePermission("RolePermissions.Manage")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRole(
        int id,
        [FromBody] RoleUpsertDto request,
        CancellationToken cancellationToken)
    {
        var result = await _roles.UpdateRoleAsync(id, request, cancellationToken);
        if (result.Failure is not null)
            return Failure(result.Failure);

        var role = result.Value!;
        using (BeginRoleManagementScope("RoleUpdated", role.Id))
        {
            _logger.LogInformation(
                "IAM role {RoleId} updated by user {ActorUserId}. Role name: {RoleName}; permission count: {PermissionCount}.",
                role.Id,
                CurrentUserId(),
                role.Name,
                role.PermissionNames.Count);
        }

        return Ok(role);
    }

    [HttpDelete("{id:int}")]
    [RequirePermission("RolePermissions.Manage")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRole(int id, CancellationToken cancellationToken)
    {
        var result = await _roles.DeleteRoleAsync(id, cancellationToken);
        if (result.Failure is not null)
            return Failure(result.Failure);

        var role = result.Value!;
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

    private IActionResult Failure(AdminOperationFailure failure)
    {
        if (failure.Kind == AdminOperationFailureKind.NotFound)
            return NotFound(new { error = failure.Message });

        if (failure.Missing.Count > 0)
            return BadRequest(new { error = failure.Message, missing = failure.Missing });

        return BadRequest(new { error = failure.Message });
    }

    private IDisposable? BeginRoleManagementScope(string iamEvent, int roleId)
    {
        return _logger.BeginScope(new Dictionary<string, object?>
        {
            ["Signal"] = LogSignals.IAM,
            ["PersistToAuditLog"] = true,
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
