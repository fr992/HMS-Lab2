using System.Security.Claims;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/users")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IUserManagementService _userManagement;

    public AdminUsersController(IUserManagementService userManagement)
    {
        _userManagement = userManagement;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CreatedUserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreatedUserResponse>> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        int? createdBy = null;
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var id))
            createdBy = id;

        var (user, error) = await _userManagement.CreateUserAsync(request, createdBy, cancellationToken);
        if (error is not null)
            return BadRequest(new { error });

        return Created($"/api/admin/users/{user!.Id}", user);
    }
}