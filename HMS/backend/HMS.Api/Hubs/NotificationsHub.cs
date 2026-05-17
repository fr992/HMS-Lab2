using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HMS.Api.Hubs;

[Authorize]
public sealed class NotificationsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = TryGetCurrentUserId();
        if (!userId.HasValue)
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            GroupName(userId.Value),
            Context.ConnectionAborted);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = TryGetCurrentUserId();
        if (userId.HasValue)
        {
            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                GroupName(userId.Value),
                CancellationToken.None);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public static string GroupName(int userId) => $"user:{userId}";

    private int? TryGetCurrentUserId()
    {
        var value = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");

        return int.TryParse(value, out var userId) && userId > 0
            ? userId
            : null;
    }
}
