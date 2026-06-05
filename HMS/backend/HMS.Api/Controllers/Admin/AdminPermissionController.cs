using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/permissions")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminPermissionsController : ControllerBase
{
    private readonly IRoleAdministrationService _roles;

    public AdminPermissionsController(IRoleAdministrationService roles) => _roles = roles;

    [HttpGet]
    [RequirePermission("Permissions.Read")]
    public async Task<IActionResult> ListPermissions(CancellationToken cancellationToken)
    {
        return Ok(await _roles.ListPermissionsAsync(cancellationToken));
    }
}
