using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class MyNotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public MyNotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    [Route("me")]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> List(
        [FromQuery] bool? isRead,
        CancellationToken cancellationToken)
    {
        var notifications = await _notificationService.GetForUserAsync(
            CurrentUserId(),
            isRead,
            cancellationToken);

        return Ok(notifications);
    }

    [HttpGet("me/unread-count")]
    public async Task<ActionResult<UnreadNotificationCountDto>> GetUnreadCount(CancellationToken cancellationToken)
    {
        var count = await _notificationService.GetUnreadCountAsync(CurrentUserId(), cancellationToken);

        return Ok(new UnreadNotificationCountDto { Count = count });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id, CancellationToken cancellationToken)
    {
        await _notificationService.MarkAsReadAsync(id, CurrentUserId(), cancellationToken);

        return NoContent();
    }

    [HttpPost("me/read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        await _notificationService.MarkAllAsReadAsync(CurrentUserId(), cancellationToken);

        return NoContent();
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid authenticated user.");

        return userId;
    }
}
