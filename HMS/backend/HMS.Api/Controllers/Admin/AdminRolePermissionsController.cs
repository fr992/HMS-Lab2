using HMS.Api.Authorization;
using HMS.Api.Logging;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/role-permissions")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminRolePermissionsController : ControllerBase
{
    private readonly IRoleAdministrationService _roles;
    private readonly ILogger<AdminRolePermissionsController> _logger;

    public AdminRolePermissionsController(
        IRoleAdministrationService roles,
        ILogger<AdminRolePermissionsController> logger)
    {
        _roles = roles;
        _logger = logger;
    }

    [HttpGet("{roleId:int}")]
    [RequirePermission("RolePermissions.Manage")]
    public async Task<IActionResult> GetForRole(int roleId, CancellationToken cancellationToken)
    {
        var result = await _roles.GetRolePermissionsAsync(roleId, cancellationToken);

        return result is null
            ? NotFound(new { error = "Role not found." })
            : Ok(result);
    }

    [HttpPut("{roleId:int}")]
    [RequirePermission("RolePermissions.Manage")]
    public async Task<IActionResult> SetRolePermissions(
        int roleId,
        [FromBody] SetRolePermissionsDto body,
        CancellationToken cancellationToken)
    {
        var result = await _roles.SetRolePermissionsAsync(roleId, body, cancellationToken);
        if (result.Failure is not null)
            return Failure(result.Failure);

        using (BeginRolePermissionsScope(roleId))
        {
            _logger.LogInformation(
                "IAM role permissions updated by user {ActorUserId}. Role {RoleId}; permission count: {PermissionCount}.",
                CurrentUserId(),
                roleId,
                result.Value!.PermissionNames.Count);
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

    private IDisposable? BeginRolePermissionsScope(int roleId)
    {
        return _logger.BeginScope(new Dictionary<string, object?>
        {
            ["Signal"] = LogSignals.IAM,
            ["PersistToAuditLog"] = true,
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
