using System.Security.Claims;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Middleware;

public sealed class MaintenanceModeMiddleware
{
    private readonly RequestDelegate _next;

    public MaintenanceModeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, HmsDbContext db)
    {
        if (IsBypassedPath(context.Request.Path) || await IsMaintenanceDisabledAsync(db, context.RequestAborted))
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

    private static async Task<bool> IsMaintenanceDisabledAsync(HmsDbContext db, CancellationToken cancellationToken)
    {
        var value = await db.Settings
            .AsNoTracking()
            .Where(setting => setting.Key == "system.maintenanceMode")
            .Select(setting => setting.Value)
            .FirstOrDefaultAsync(cancellationToken);

        return !string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAdmin(ClaimsPrincipal user)
    {
        return user.IsInRole("Admin") || user.IsInRole("SuperAdmin");
    }
}
