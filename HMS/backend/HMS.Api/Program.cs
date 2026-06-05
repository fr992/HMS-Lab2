using HMS.Api.Authorization;
using HMS.Api.Hubs;
using HMS.Api.Logging;
using HMS.Api.Middleware;
using HMS.Api.Notifications;
using HMS.Api.Security;
using HMS.Application;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using HMS.Persistence.Mongo;
using Identity.Domain.Entities;
using Identity.Infrastructure;
using Identity.Infrastructure.Seed;
using Identity.Infrastructure.Services;
using Identity.Infrastructure.Services.Patients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Stripe;
using Serilog;
using Serilog.Context;
using Serilog.Events;
using Serilog.Sinks.MSSqlServer;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Host.UseSerilog((context, services, loggerConfiguration) =>
{
    ConfigureSerilog(context.Configuration, services, loggerConfiguration);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend",
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173", "http://localhost:5174")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "HMS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddApplication();
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IAppointmentRequestService, AppointmentRequestService>();
builder.Services.AddScoped<IMedicationsService, MedicationsService>();
builder.Services.AddScoped<IPrescriptionService, PrescriptionService>();
builder.Services.AddScoped<ILabRequestService, LabRequestService>();
builder.Services.AddScoped<ILabResultService, LabResultService>();
builder.Services.AddScoped<ILabTestService, LabTestService>();
builder.Services.AddScoped<IDoctorDashboardService, DoctorDashboardService>();
builder.Services.AddScoped<INurseTaskService, NurseTaskService>();
builder.Services.AddScoped<IBedService, BedService>();
builder.Services.AddScoped<IBedAssignmentRequestService, BedAssignmentRequestService>();
builder.Services.AddScoped<IInvoiceService, Identity.Infrastructure.Services.InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<INotificationRealtimeSender, SignalRNotificationRealtimeSender>();
builder.Services.AddScoped<IStripeService, StripeService>();
StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    foreach (var p in HmsPermissions.All)
        options.AddPolicy(PolicyNames.ForPermission(p), policy =>
            policy.Requirements.Add(new PermissionRequirement(p)));
});

var app = builder.Build();
var demoSeedCount = GetDemoSeedCount(args);
var seedDemoData = HasFlag(args, "--seed-demo");
var rollbackDemoData = HasFlag(args, "--rollback-demo");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!EF.IsDesignTime)
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<IMongoDbInitializer>().InitializeAsync(CancellationToken.None);
    await scope.ServiceProvider.GetRequiredService<IdentityDataSeeder>().SeedAsync();

    if (rollbackDemoData)
        await scope.ServiceProvider.GetRequiredService<DemoDataSeeder>().RollbackAsync(CancellationToken.None);

    if (seedDemoData)
        await scope.ServiceProvider.GetRequiredService<DemoDataSeeder>().SeedAsync(demoSeedCount, CancellationToken.None);
}

if (seedDemoData || rollbackDemoData)
{
    await app.StopAsync();
    return;
}

app.UseHttpsRedirection();
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (httpContext, elapsed, exception) =>
    {
        if (exception is not null || httpContext.Response.StatusCode >= StatusCodes.Status500InternalServerError)
            return LogEventLevel.Error;

        if (httpContext.Response.StatusCode >= StatusCodes.Status400BadRequest)
            return LogEventLevel.Warning;

        return LogEventLevel.Information;
    };

    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        var endpoint = httpContext.GetEndpoint();

        diagnosticContext.Set("Signal", LogSignals.WebApp);
        diagnosticContext.Set("TraceId", httpContext.TraceIdentifier);
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
        diagnosticContext.Set("EndpointName", endpoint?.DisplayName);
        diagnosticContext.Set("Authenticated", httpContext.User.Identity?.IsAuthenticated == true);
        diagnosticContext.Set("ActorUserId", CurrentUserId(httpContext.User));
        diagnosticContext.Set("RemoteIpAddress", httpContext.Connection.RemoteIpAddress?.ToString());

        if (httpContext.Request.ContentLength.HasValue)
            diagnosticContext.Set("RequestContentLength", httpContext.Request.ContentLength.Value);
    };
});
app.Use(async (context, next) =>
{
    using (LogContext.PushProperty("TraceId", context.TraceIdentifier))
    using (LogContext.PushProperty("Signal", LogSignals.WebApp))
    {
        await next();
    }
});
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("frontend");
app.UseAuthentication();
app.UseMiddleware<MaintenanceModeMiddleware>();
app.UseAuthorization();
app.UseMiddleware<DashboardUpdateMiddleware>();
app.MapControllers();
app.MapHub<NotificationsHub>("/hubs/notifications");
app.MapHub<DashboardHub>("/hubs/dashboard");

await app.RunAsync();

static void ConfigureSerilog(
    IConfiguration configuration,
    IServiceProvider services,
    LoggerConfiguration loggerConfiguration)
{
    var serilogSection = configuration.GetSection("Serilog");
    var seqUrl = GetRequiredConfigurationValue(serilogSection, "Seq:ServerUrl");

    var sqlSection = serilogSection.GetSection("SqlServer");
    var sqlConnectionStringName = sqlSection["ConnectionStringName"] ?? "HMS";
    var sqlConnectionString = configuration.GetConnectionString(sqlConnectionStringName);
    if (string.IsNullOrWhiteSpace(sqlConnectionString))
    {
        throw new InvalidOperationException(
            $"ConnectionStrings:{sqlConnectionStringName} is required for the Serilog SQL Server sink.");
    }

    var batchPostingLimit = Math.Max(1, sqlSection.GetValue("BatchPostingLimit", 50));
    var batchPeriodSeconds = Math.Max(1, sqlSection.GetValue("BatchPeriodSeconds", 5));

    var sqlSinkOptions = new MSSqlServerSinkOptions
    {
        TableName = sqlSection["TableName"] ?? "SystemAuditLogs",
        AutoCreateSqlTable = sqlSection.GetValue("AutoCreateSqlTable", true),
        BatchPostingLimit = batchPostingLimit,
        BatchPeriod = TimeSpan.FromSeconds(batchPeriodSeconds)
    };

    loggerConfiguration
        .ReadFrom.Services(services)
        .MinimumLevel.Verbose()
        .MinimumLevel.Override("Microsoft.AspNetCore.Authentication", LogEventLevel.Information)
        .MinimumLevel.Override("Microsoft.AspNetCore.Authorization", LogEventLevel.Information)
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("System", LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithThreadId()
        .WriteTo.Seq(seqUrl, restrictedToMinimumLevel: LogEventLevel.Verbose)
        .WriteTo.Logger(auditLogger => auditLogger
            .Filter.ByIncludingOnly(ShouldPersistToAdminAuditLog)
            .WriteTo.MSSqlServer(
                connectionString: sqlConnectionString,
                sinkOptions: sqlSinkOptions,
                restrictedToMinimumLevel: LogEventLevel.Information));
}

static bool ShouldPersistToAdminAuditLog(LogEvent logEvent)
{
    if (logEvent.Level >= LogEventLevel.Error)
        return true;

    return logEvent.Properties.TryGetValue("PersistToAuditLog", out var value)
        && value is ScalarValue { Value: true };
}

static string GetRequiredConfigurationValue(IConfiguration configuration, string key)
{
    var value = configuration[key];
    if (string.IsNullOrWhiteSpace(value))
    {
        throw new InvalidOperationException($"Serilog:{key} is required.");
    }

    return value;
}

static string? CurrentUserId(ClaimsPrincipal user)
{
    return user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? user.FindFirstValue("sub");
}

static bool HasFlag(string[] args, string flag) =>
    args.Any(arg => string.Equals(arg, flag, StringComparison.OrdinalIgnoreCase));

static int? GetDemoSeedCount(string[] args)
{
    for (var i = 0; i < args.Length; i++)
    {
        if (!string.Equals(args[i], "--demo-seed-count", StringComparison.OrdinalIgnoreCase))
            continue;

        if (i + 1 < args.Length && int.TryParse(args[i + 1], out var count))
            return count;
    }

    return null;
}
