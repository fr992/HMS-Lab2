using System.Security.Claims;
using HMS.Application.Abstractions.Identity;

namespace HMS.Api.Middleware;

public sealed class MaintenanceModeMiddleware
{
    private readonly RequestDelegate _next;

    public MaintenanceModeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ISettingsService settings)
    {
        if (IsBypassedPath(context.Request.Path) || await IsMaintenanceDisabledAsync(settings, context.RequestAborted))
        {
            await _next(context);
            return;
        }

        if (IsAdmin(context.User))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(
            new { message = "The system is currently in maintenance mode." },
            context.RequestAborted);
    }

    private static bool IsBypassedPath(PathString path)
    {
        return path.StartsWithSegments("/api/auth")
            || path.StartsWithSegments("/swagger")
            || path.StartsWithSegments("/hubs/notifications");
    }

    private static async Task<bool> IsMaintenanceDisabledAsync(ISettingsService settings, CancellationToken cancellationToken)
    {
        var value = await settings.GetValueAsync("system.maintenanceMode", cancellationToken);

        return !string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAdmin(ClaimsPrincipal user)
    {
        return user.IsInRole("Admin") || user.IsInRole("SuperAdmin");
    }
}
