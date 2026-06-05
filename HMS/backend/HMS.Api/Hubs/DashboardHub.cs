using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HMS.Api.Hubs;

[Authorize]
public sealed class DashboardHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var roles = Context.User?.FindAll(ClaimTypes.Role)
            .Select(claim => claim.Value)
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray() ?? [];

        if (roles.Length == 0)
        {
            Context.Abort();
            return;
        }

        foreach (var role in roles)
        {
            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                RoleGroup(role),
                Context.ConnectionAborted);
        }

        await base.OnConnectedAsync();
    }

    public static string RoleGroup(string role) => $"dashboard:role:{NormalizeRole(role)}";

    private static string NormalizeRole(string role) =>
        role.Trim().Replace(" ", string.Empty).ToLowerInvariant();
}
