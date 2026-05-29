using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers;

[ApiController]
[Route("api/user-profile")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;

    public UserProfileController(IUserProfileService userProfileService)
    {
        _userProfileService = userProfileService;
    }

    [HttpGet]
    public async Task<ActionResult<UserProfileDto>> GetProfile(
        CancellationToken cancellationToken)
    {
        var currentUserId = CurrentUserId();

        if (string.IsNullOrWhiteSpace(currentUserId))
            return Unauthorized();

        var result = await _userProfileService.GetProfileInfoAsync(
            int.Parse(currentUserId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPut]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile(
        UserProfileUpdateDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = CurrentUserId();

        if (string.IsNullOrWhiteSpace(currentUserId))
            return Unauthorized();

        var result = await _userProfileService.UpdateProfileInfoAsync(
            int.Parse(currentUserId),
            request,
            cancellationToken);

        return Ok(result);
    }

    private string? CurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
    }
}
