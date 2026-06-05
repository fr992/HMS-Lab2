using HMS.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace HMS.Api.Middleware;

public sealed class DashboardUpdateMiddleware
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post,
        HttpMethods.Put,
        HttpMethods.Patch,
        HttpMethods.Delete
    };

    private static readonly string[] DashboardRoles =
    [
        "Admin",
        "SuperAdmin",
        "Receptionist",
        "Doctor",
        "Nurse",
        "Infermier",
        "Laboratorant",
        "Patient"
    ];

    private const string DashboardChangedEvent = "dashboardChanged";

    private readonly RequestDelegate _next;

    public DashboardUpdateMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IHubContext<DashboardHub> hubContext)
    {
        await _next(context);

        if (!ShouldNotify(context))
            return;

        var areas = ResolveAreas(context.Request.Path);
        if (areas.Count == 0)
            return;

        var payload = new
        {
            areas,
            changedAt = DateTimeOffset.UtcNow
        };

        var groups = ResolveTargetRoles(areas).Select(DashboardHub.RoleGroup).ToArray();
        await hubContext.Clients.Groups(groups).SendAsync(
            DashboardChangedEvent,
            payload,
            context.RequestAborted);
    }

    private static bool ShouldNotify(HttpContext context)
    {
        if (!MutatingMethods.Contains(context.Request.Method))
            return false;

        if (!context.Request.Path.StartsWithSegments("/api"))
            return false;

        return context.Response.StatusCode is >= 200 and < 300;
    }

    private static IReadOnlyCollection<string> ResolveAreas(PathString path)
    {
        var value = path.Value?.ToLowerInvariant() ?? string.Empty;
        var areas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        AddArea(value, areas, "patients", "patients");
        AddArea(value, areas, "appointments", "receptionist/appointments", "appointment-requests", "public/appointment-requests");
        AddArea(value, areas, "onlineRequests", "appointment-requests", "public/appointment-requests");
        AddArea(value, areas, "lab", "lab/requests", "lab-results", "admin/lab-tests");
        AddArea(value, areas, "nurseTasks", "nurse-tasks");
        AddArea(value, areas, "payments", "payments", "invoices", "stripe");
        AddArea(value, areas, "beds", "beds", "bed-assignment-requests");
        AddArea(value, areas, "encounters", "encounters", "diagnoses", "prescriptions");
        AddArea(value, areas, "staff", "admin/users", "admin/staff", "admin/roles", "admin/departments", "departments");

        if (value.Contains("/api/encounters/", StringComparison.Ordinal) &&
            (value.Contains("/lab-requests", StringComparison.Ordinal) ||
             value.Contains("/nurse-tasks", StringComparison.Ordinal) ||
             value.Contains("/bed-assignment-requests", StringComparison.Ordinal)))
        {
            areas.Add("encounters");
            areas.Add("lab");
            areas.Add("nurseTasks");
            areas.Add("beds");
        }

        return areas;
    }

    private static IReadOnlyCollection<string> ResolveTargetRoles(IReadOnlyCollection<string> areas)
    {
        var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Admin",
            "SuperAdmin"
        };

        foreach (var area in areas)
        {
            switch (area)
            {
                case "patients":
                    roles.UnionWith(["Receptionist", "Doctor", "Nurse", "Patient"]);
                    break;
                case "appointments":
                case "onlineRequests":
                    roles.UnionWith(["Receptionist", "Doctor", "Patient"]);
                    break;
                case "lab":
                    roles.UnionWith(["Laboratorant", "Doctor", "Patient"]);
                    break;
                case "nurseTasks":
                    roles.UnionWith(["Nurse", "Infermier", "Doctor"]);
                    break;
                case "payments":
                    roles.UnionWith(["Receptionist", "Patient"]);
                    break;
                case "beds":
                    roles.UnionWith(["Receptionist", "Doctor", "Nurse", "Infermier"]);
                    break;
                case "encounters":
                    roles.UnionWith(["Doctor", "Nurse", "Infermier", "Patient"]);
                    break;
                case "staff":
                    roles.UnionWith(["Receptionist", "Laboratorant", "Doctor", "Nurse", "Infermier"]);
                    break;
            }
        }

        return roles.Where(role => DashboardRoles.Contains(role, StringComparer.OrdinalIgnoreCase)).ToArray();
    }

    private static void AddArea(string path, ISet<string> areas, string area, params string[] segments)
    {
        if (segments.Any(segment => path.Contains($"/api/{segment}", StringComparison.Ordinal)))
            areas.Add(area);
    }
}
