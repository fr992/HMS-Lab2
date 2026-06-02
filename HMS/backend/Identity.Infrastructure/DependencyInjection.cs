using System.Text;
using System.Security.Claims;
using HMS.Application.Abstractions.Identity;
using Identity.Domain.Entities;
using Identity.Infrastructure.Jwt;
using Identity.Infrastructure.Seed;
using Identity.Infrastructure.Services;
using Identity.Infrastructure.Services.Patients;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<SeedSettings>(configuration.GetSection(SeedSettings.SectionName));

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        var jwt = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();
        var keyBytes = Encoding.UTF8.GetBytes(jwt.Key ?? string.Empty);
        if (keyBytes.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be at least 32 characters (UTF-8).");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2),
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                    NameClaimType = System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/hubs/notifications"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("HMS.IAM.JwtBearer");

                        using var scope = logger.BeginScope(new Dictionary<string, object?>
                        {
                            ["Signal"] = "IAM",
                            ["IamEvent"] = "JwtAuthenticationFailed",
                            ["TraceId"] = context.HttpContext.TraceIdentifier,
                            ["RequestPath"] = context.HttpContext.Request.Path.Value,
                            ["RemoteIpAddress"] = context.HttpContext.Connection.RemoteIpAddress?.ToString()
                        });

                        logger.LogWarning(
                            "IAM JWT authentication failed with exception type {ExceptionType} for {RequestPath}.",
                            context.Exception.GetType().Name,
                            context.HttpContext.Request.Path.Value);

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("HMS.IAM.JwtBearer");

                        var actorUserId = context.Principal?.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)
                            ?? context.Principal?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);

                        using var scope = logger.BeginScope(new Dictionary<string, object?>
                        {
                            ["Signal"] = "IAM",
                            ["IamEvent"] = "JwtTokenValidated",
                            ["ActorUserId"] = actorUserId,
                            ["TraceId"] = context.HttpContext.TraceIdentifier,
                            ["RequestPath"] = context.HttpContext.Request.Path.Value,
                            ["RemoteIpAddress"] = context.HttpContext.Connection.RemoteIpAddress?.ToString()
                        });

                        logger.LogInformation(
                            "IAM JWT token validated for user {ActorUserId}.",
                            actorUserId ?? "anonymous");

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<IStaffProfileService, StaffProfileService>();
        services.AddScoped<IdentityDataSeeder>();
        services.AddScoped<DemoDataSeeder>();
        services.AddScoped<IPatientContactService, PatientContactService>();
        services.AddScoped<IEncounterService, EncounterService>();
        services.AddScoped<IDiagnosisService, DiagnosisService>();
        services.AddScoped<ILabRequestService, LabRequestService>();
        services.AddScoped<ILabResultService, LabResultService>();
        services.AddScoped<ILabTestService, LabTestService>();
        services.AddScoped<IBedService, BedService>();
        services.AddScoped<IBedAssignmentRequestService, BedAssignmentRequestService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IMedicationsService, MedicationsService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<INotificationService, MongoNotificationService>();
        return services;
    }
}
