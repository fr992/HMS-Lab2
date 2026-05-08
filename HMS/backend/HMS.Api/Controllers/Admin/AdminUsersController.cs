using System.Security.Claims;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HMS.Api.Authorization;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "SuperAdmin")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IUserManagementService _userManagement;

    public AdminUsersController(IUserManagementService userManagement)
    {
        _userManagement = userManagement;
    }

     private int? CurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(sub, out var id) ? id : null;
    }

    [RequirePermission("Users.Create")]
    [HttpPost]
    [ProducesResponseType(typeof(CreatedUserResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreatedUserResponseDto>> Create(
        [FromBody] CreateUserRequestDto request,
        CancellationToken cancellationToken)
    {

        var createdBy = CurrentUserId();

        var (user, error) = await _userManagement.CreateUserAsync(request, createdBy, cancellationToken);
        if (error is not null)
            return BadRequest(new { error });

        return Created($"/api/admin/users/{user!.Id}", user);
    }

    [HttpGet]
    [RequirePermission("Users.Read")]
    public async Task<ActionResult<PaginatedResponse<UserListItemResponseDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] string? status,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var (items, error) = await _userManagement.ListUsersAsync(
            search ?? pagination.Search,
            role,
            status,
            pagination,
            cancellationToken);
        if (error is not null)
            return BadRequest(new { error });
        return Ok(items);
    }
    [HttpGet("{id:int}")]
    [RequirePermission("Users.Read")]
    public async Task<ActionResult<UserDetailResponseDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var (user, error) = await _userManagement.GetUserByIdAsync(id, cancellationToken);
        if (error is not null)
            return NotFound(new { error });
        return Ok(user);
    }
    [HttpPut("{id:int}")]
    [RequirePermission("Users.Update")]
    public async Task<ActionResult<UserDetailResponseDto>> Update(
        int id,
        [FromBody] UpdateUserRequestDto request,
        CancellationToken cancellationToken)
    {
        var (user, error) = await _userManagement.UpdateUserAsync(id, request, cancellationToken);
        if (error is not null)
            return BadRequest(new { error });
        return Ok(user);
    }
    [HttpPatch("{id:int}/active")]
    [RequirePermission("Users.SetActive")]
    public async Task<IActionResult> SetActive(
        int id,
        [FromBody] SetUserActiveRequestDto request,
        CancellationToken cancellationToken)
    {
        var (ok, error) = await _userManagement.SetUserActiveAsync(id, request.IsActive, cancellationToken);
        if (error is not null)
            return BadRequest(new { error });
        return ok ? NoContent() : BadRequest();
    }
}
