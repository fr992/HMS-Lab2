using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Identity.Infrastructure.Seed;

public sealed class IdentityDataSeeder
{
    private const string SuperAdminRoleName = "SuperAdmin";
    private const string SuperAdminEmail = "admin@hms.local";

    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly SeedSettings _seed;
    private readonly ILogger<IdentityDataSeeder> _logger;

    private static readonly string[] RoleNames =
    [
        SuperAdminRoleName,
        "Admin",
        "Doctor",
        "Nurse",
        "Patient",
        "Receptionist",
        "Laboratorant"
    ];

    private static readonly IReadOnlyDictionary<string, string> PermissionDescriptions =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Users.Create"] = "Creates staff users.",
            ["Users.Read"] = "Reads users.",
            ["Users.Update"] = "Updates users.",
            ["Users.SetActive"] = "Activates or deactivates users.",
            ["Roles.Read"] = "Reads roles.",
            ["Permissions.Read"] = "Reads permissions.",
            ["RolePermissions.Manage"] = "Assigns permissions to roles.",
            ["AuditLogs.Read"] = "Reads audit logs.",
            ["Settings.Manage"] = "Manages system settings.",
            ["Patients.Register"] = "Registers patients.",
            ["Patients.Read"] = "Reads patient data.",
            ["Patients.Update"] = "Updates patient data.",
            ["Patients.Delete"] = "Deletes patient data.",
            ["Appointments.Read"] = "Reads appointments.",
            ["Appointments.Create"] = "Creates appointments.",
            ["Appointments.ManageStatus"] = "Manages appointment status.",
            ["Invoices.Read"] = "Reads invoices.",
            ["Invoices.Create"] = "Creates invoices.",
            ["Invoices.Update"] = "Updates invoices.",
            ["Invoices.Cancel"] = "Cancels invoices.",
            ["Payments.Read"] = "Reads payments.",
            ["Payments.Create"] = "Creates payments.",
            ["Payments.UpdateStatus"] = "Updates payment status.",
            ["Payments.ConfirmCash"] = "Confirms cash payments.",
            ["LabResults.Read"] = "Reads lab results.",
            ["Encounters.Create"] = "Creates encounters.",
            ["Encounters.Read"] = "Reads encounters.",
            ["Encounters.Update"] = "Updates encounters.",
            ["Encounters.Close"] = "Closes encounters.",
            ["Diagnoses.Manage"] = "Manages diagnoses.",
            ["Departments.Read"] = "Reads departments.",
            ["Departments.Create"] = "Creates departments.",
            ["Departments.Update"] = "Updates departments.",
            ["Departments.Delete"] = "Deletes departments.",
            ["Prescriptions.Read"] = "Reads prescriptions.",
            ["Prescriptions.Create"] = "Creates prescriptions.",
            ["Prescriptions.Update"] = "Updates prescriptions.",
            ["Prescriptions.Delete"] = "Deletes prescriptions.",
            ["Medications.Read"] = "Reads medications.",
            ["Medications.Create"] = "Creates medications.",
            ["Medications.Update"] = "Updates medications.",
            ["Medications.Delete"] = "Deletes medications.",
            ["LabTests.Read"] = "Reads lab tests.",
            ["LabTests.Create"] = "Creates lab tests.",
            ["LabTests.Update"] = "Updates lab tests.",
            ["LabTests.Delete"] = "Deletes lab tests.",
            ["LabRequests.Create"] = "Creates lab requests.",
            ["Nurses.Read"] = "Reads nurses.",
            ["NurseTasks.Assign"] = "Assigns nurse tasks.",
            ["NurseTasks.Read"] = "Reads nurse tasks.",
            ["NurseTasks.Complete"] = "Completes nurse tasks.",
            ["Beds.Read"] = "Reads beds and occupancy.",
            ["Beds.Create"] = "Creates beds.",
            ["Beds.Update"] = "Updates beds.",
            ["Beds.Assign"] = "Assigns beds to patients.",
            ["Beds.Release"] = "Releases beds from patients.",
            ["BedAssignmentRequests.Create"] = "Creates bed assignment requests.",
            ["BedAssignmentRequests.Read"] = "Reads bed assignment requests.",
            ["BedAssignmentRequests.Assign"] = "Assigns beds from approved bed assignment requests.",
            ["BedAssignmentRequests.Reject"] = "Rejects bed assignment requests.",
            ["LabRequests.Read"] = "Reads lab requests.",
            ["LabRequests.UpdateStatus"] = "Updates lab request status.",
            ["LabResults.Create"] = "Creates lab results.",
            ["LabResults.Update"] = "Updates lab results.",
            ["LabResults.Publish"] = "Publishes lab results.",
            ["Own.Appointments.View"] = "Views own appointments.",
            ["Own.Appointments.Request"] = "Requests own appointments.",
            ["Own.MedicalHistory.View"] = "Views own medical history.",
            ["Own.LabResults.View"] = "Views own lab results.",
            ["Own.LabResults.Download"] = "Downloads own lab results.",
            ["Own.Invoices.View"] = "Views own invoices.",
            ["Own.Payments.PayOnline"] = "Pays online.",
            ["Own.Notifications.View"] = "Views own notifications."
        };

    private static readonly (string RoleName, string[] PermissionNames)[] RolePermissionMap =
    [
        (SuperAdminRoleName, HmsPermissions.All),
        ("Admin",
        [
            "Users.Create", "Users.Read", "Users.Update", "Users.SetActive",
            "Roles.Read", "Permissions.Read", "Patients.Register", "Patients.Read", "Patients.Update", "Patients.Delete", "RolePermissions.Manage",
            "AuditLogs.Read", "Settings.Manage",
            "Appointments.Read", "Appointments.Create", "Appointments.ManageStatus",
            "Encounters.Create", "Encounters.Read", "Encounters.Update", "Encounters.Close",
            "Diagnoses.Manage",
            "Departments.Read", "Departments.Create", "Departments.Update", "Departments.Delete",
            "Invoices.Read", "Invoices.Create", "Invoices.Update", "Invoices.Cancel",
            "Payments.Read", "Payments.Create", "Payments.UpdateStatus", "Payments.ConfirmCash",
            "Prescriptions.Read", "Prescriptions.Create", "Prescriptions.Update", "Prescriptions.Delete",
            "Medications.Read", "Medications.Create", "Medications.Update", "Medications.Delete",
            "LabTests.Read", "LabTests.Create", "LabTests.Update", "LabTests.Delete",
            "LabRequests.Read", "LabRequests.Create", "LabRequests.UpdateStatus",
            "LabResults.Update",
            "Nurses.Read", "NurseTasks.Assign", "NurseTasks.Read", "NurseTasks.Complete",
            "Beds.Read", "Beds.Create", "Beds.Update", "Beds.Assign", "Beds.Release",
            "BedAssignmentRequests.Create", "BedAssignmentRequests.Read", "BedAssignmentRequests.Assign", "BedAssignmentRequests.Reject",
        ]),
        ("Receptionist",
        [
            "Patients.Register", "Patients.Read", "Patients.Update", "Patients.Delete",
            "Appointments.Read", "Appointments.Create", "Appointments.ManageStatus",
            "Invoices.Read", "Invoices.Create", "Invoices.Update", "Invoices.Cancel",
            "Payments.Read", "Payments.Create", "Payments.UpdateStatus", "Payments.ConfirmCash",
            "LabResults.Read",
            "LabTests.Read",
            "Beds.Read", "Beds.Create", "Beds.Update", "Beds.Assign", "Beds.Release",
            "BedAssignmentRequests.Read", "BedAssignmentRequests.Assign", "BedAssignmentRequests.Reject"
        ]),
        ("Doctor",
        [
            "Patients.Read",
            "Appointments.Read",
            "Encounters.Create", "Encounters.Read", "Encounters.Update", "Encounters.Close",
            "Diagnoses.Manage",
            "Prescriptions.Read", "Prescriptions.Create", "Prescriptions.Update",
            "Medications.Read",
            "LabTests.Read",
            "LabRequests.Create",
            "Nurses.Read",
            "NurseTasks.Assign",
            "NurseTasks.Read",
            "LabResults.Create",
            "Beds.Read", "BedAssignmentRequests.Create", "BedAssignmentRequests.Read"
        ]),
        ("Nurse",
        [
            "NurseTasks.Read", "NurseTasks.Complete", "Beds.Read", "BedAssignmentRequests.Create"
        ]),
        //("Infermier",
        //[
        //    "NurseTasks.Read", "NurseTasks.Complete", "Beds.Read", "BedAssignmentRequests.Create"
        //]),
        ("Laboratorant",
        [
            "LabTests.Read",
            "LabRequests.Read", "LabRequests.UpdateStatus", "LabResults.Read",
            "LabResults.Create", "LabResults.Update", "LabResults.Publish"
        ]),
        ("Patient",
        [
            "Own.Appointments.View", "Own.Appointments.Request",
            "Own.MedicalHistory.View",
            "Own.LabResults.View", "Own.LabResults.Download",
            "Own.Invoices.View", "Own.Payments.PayOnline",
            "Own.Notifications.View"
        ])
    ];

    private static readonly (string Key, string Value, string Description)[] DefaultSettings =
    [
        ("hospital.name", "Nexora Hospital", "Primary hospital display name."),
        ("hospital.logoUrl", "/nexora-logo.png", "Public hospital logo URL."),
        ("hospital.email", "contact@nexora.local", "Public contact email for hospital communications."),
        ("hospital.phone", "+1 (555) 123-4567", "Primary hospital contact phone number."),
        ("hospital.address", "123 Medical Avenue, Healthcare City", "Primary hospital address."),
        ("hospital.emergencyPhone", "+1 (555) 911-0000", "Public emergency contact phone number."),
        ("hospital.workingHours", "Open 24/7 for emergency care. Clinics: Mon-Fri, 8:00 AM - 6:00 PM.", "Public working hours summary."),
        ("landing.heroTitle", "Premium care, close to home.", "Primary public website hero title."),
        ("landing.heroSubtitle", "Nexora Hospital brings together specialist care, connected diagnostics, and coordinated teams so every patient journey feels clear from the first visit.", "Primary public website hero description."),
        ("landing.aboutText", "Senior clinicians, nursing leads, and front-desk operations work from the same care record so every handoff has context.", "Public website about section text."),
        ("landing.emergencyContactText", "24/7 Emergency Care", "Public emergency contact label."),
        ("landing.footerText", "Copyright 2026. All rights reserved.", "Public website footer text."),
        ("notifications.emailEnabled", "true", "Enables outbound email notifications."),
        ("notifications.smsEnabled", "false", "Enables outbound SMS notifications."),
        ("notifications.systemAlertsEnabled", "true", "Enables administrative system alert notifications."),
        ("pharmacy.lowStockAlertsEnabled", "true", "Enables pharmacy low-stock alerts."),
        ("appointments.defaultDurationMinutes", "30", "Default appointment duration in minutes."),
        ("appointments.allowOnlineRequests", "true", "Allows patients to submit online appointment requests."),
        ("security.sessionTimeoutMinutes", "120", "User session timeout in minutes."),
        ("billing.currency", "USD", "Default billing currency."),
        ("system.maintenanceMode", "false", "Temporarily places the portal in maintenance mode."),
        ("system.auditRetentionDays", "365", "Number of days to retain audit logs.")
    ];

    public IdentityDataSeeder(
        HmsDbContext db,
        IPasswordHasher<User> passwordHasher,
        IOptions<SeedSettings> seedOptions,
        ILogger<IdentityDataSeeder> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _seed = seedOptions.Value;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (_seed.EnsureRoles)
        {
            await EnsureRolesAsync(cancellationToken);
            await EnsurePermissionsAsync(cancellationToken);
            await EnsureRolePermissionsAsync(cancellationToken);
        }

        if (_seed.EnsureBootstrapAdmin && !string.IsNullOrWhiteSpace(_seed.AdminPassword))
            await EnsureBootstrapAdminAsync(cancellationToken);
        else if (_seed.EnsureBootstrapAdmin && string.IsNullOrWhiteSpace(_seed.AdminPassword))
            _logger.LogWarning("Seed:AdminPassword is empty; bootstrap admin was not created.");

        await EnsureSuperAdminAssignmentAsync(cancellationToken);
        await EnsureDefaultSettingsAsync(cancellationToken);
    }

    private async Task EnsureDefaultSettingsAsync(CancellationToken cancellationToken)
    {
        var existingKeys = await _db.Settings
            .AsNoTracking()
            .Select(setting => setting.Key)
            .ToListAsync(cancellationToken);

        var existing = existingKeys.ToHashSet(StringComparer.Ordinal);
        var now = DateTime.UtcNow;

        foreach (var (key, value, description) in DefaultSettings)
        {
            if (existing.Contains(key))
                continue;

            _db.Settings.Add(new Setting
            {
                Key = key,
                Value = value,
                Description = description,
                UpdatedAt = now
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureRolesAsync(CancellationToken cancellationToken)
    {
        var descriptions = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [SuperAdminRoleName] = "Has every permission in the system.",
            ["Admin"] = "Manages the system, users, and permissions.",
            ["Doctor"] = "Clinical care: encounters, diagnoses, prescriptions, lab requests, and nurse tasks.",
            ["Nurse"] = "Completes assigned nursing tasks.",
            ["Patient"] = "Patient portal access.",
            ["Receptionist"] = "Front desk workflows.",
            ["Laboratorant"] = "Laboratory requests, results, and publishing."
        };

        foreach (var name in RoleNames)
        {
            if (await _db.Roles.AnyAsync(r => r.Name == name, cancellationToken))
                continue;

            descriptions.TryGetValue(name, out var desc);

            _db.Roles.Add(new Role
            {
                Name = name,
                Description = desc ?? name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsurePermissionsAsync(CancellationToken cancellationToken)
    {
        foreach (var name in HmsPermissions.All.Distinct(StringComparer.Ordinal))
        {
            if (await _db.Permissions.AnyAsync(p => p.Name == name, cancellationToken))
                continue;

            var description = PermissionDescriptions.TryGetValue(name, out var value)
                ? value
                : name;

            var now = DateTime.UtcNow;
            _db.Permissions.Add(new Permission
            {
                Name = name,
                Description = description,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureRolePermissionsAsync(CancellationToken cancellationToken)
    {
        var roles = await _db.Roles.AsNoTracking()
            .ToDictionaryAsync(r => r.Name, r => r.Id, cancellationToken);
        var permissions = await _db.Permissions.AsNoTracking()
            .ToDictionaryAsync(p => p.Name, p => p.Id, cancellationToken);

        if (roles.TryGetValue("Doctor", out var doctorRoleId) &&
            permissions.TryGetValue("Beds.Assign", out var bedsAssignPermissionId))
        {
            var directBedAssignLinks = await _db.RolePermissions
                .Where(rp => rp.RoleId == doctorRoleId && rp.PermissionId == bedsAssignPermissionId)
                .ToListAsync(cancellationToken);

            if (directBedAssignLinks.Count > 0)
                _db.RolePermissions.RemoveRange(directBedAssignLinks);
        }

        foreach (var nurseRoleName in new[] { "Nurse" })
        {
            if (!roles.TryGetValue(nurseRoleName, out var nurseRoleId))
                continue;

            var disallowed = new[]
            {
                "Beds.Create",
                "Beds.Update",
                "Beds.Assign",
                "Beds.Release",
                "AuditLogs.Read"
            };

            var disallowedPermissionIds = disallowed
                .Where(permissions.ContainsKey)
                .Select(name => permissions[name])
                .ToList();

            if (disallowedPermissionIds.Count == 0)
                continue;

            var links = await _db.RolePermissions
                .Where(rp => rp.RoleId == nurseRoleId && disallowedPermissionIds.Contains(rp.PermissionId))
                .ToListAsync(cancellationToken);

            if (links.Count > 0)
                _db.RolePermissions.RemoveRange(links);
        }

        foreach (var (roleName, permissionNames) in RolePermissionMap)
        {
            if (!roles.TryGetValue(roleName, out var roleId))
            {
                _logger.LogWarning("Seed: role {RoleName} not found; skipping its permissions.", roleName);
                continue;
            }

            foreach (var permName in permissionNames.Distinct(StringComparer.Ordinal))
            {
                if (!permissions.TryGetValue(permName, out var permissionId))
                {
                    _logger.LogWarning("Seed: permission {PermName} not found; skipping link for {RoleName}.", permName, roleName);
                    continue;
                }

                var exists = await _db.RolePermissions.AnyAsync(
                    rp => rp.RoleId == roleId && rp.PermissionId == permissionId,
                    cancellationToken);

                if (exists)
                    continue;

                var now = DateTime.UtcNow;
                _db.RolePermissions.Add(new RolePermission
                {
                    RoleId = roleId,
                    PermissionId = permissionId,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureBootstrapAdminAsync(CancellationToken cancellationToken)
    {
        var adminRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin", cancellationToken);
        if (adminRole is null)
        {
            _logger.LogWarning("Admin role missing; cannot seed bootstrap admin.");
            return;
        }

        var email = _seed.AdminEmail.Trim().ToLowerInvariant();
        var userName = _seed.AdminUserName.Trim();

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email, cancellationToken);

        user ??= await _db.Users
            .FirstOrDefaultAsync(u => u.UserName == userName, cancellationToken);

        if (user is null)
        {
            user = new User
            {
                UserName = userName,
                Email = email,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, _seed.AdminPassword);

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            var person = new Person
            {
                UserId = user.Id,
                FirstName = _seed.AdminFirstName,
                LastName = _seed.AdminLastName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.People.Add(person);
            await _db.SaveChangesAsync(cancellationToken);
        }
        else if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = email;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        await EnsureUserRoleAsync(user.Id, adminRole.Id, cancellationToken);
        _logger.LogInformation("Bootstrap admin user {UserName} is linked to Admin.", user.UserName);
    }

    private async Task EnsureSuperAdminAssignmentAsync(CancellationToken cancellationToken)
    {
        var superAdminRole = await _db.Roles
            .FirstOrDefaultAsync(r => r.Name == SuperAdminRoleName, cancellationToken);

        if (superAdminRole is null)
        {
            _logger.LogWarning("Seed: {RoleName} role missing; cannot assign {Email}.", SuperAdminRoleName, SuperAdminEmail);
            return;
        }

        var superAdmin = await _db.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == SuperAdminEmail, cancellationToken);

        if (superAdmin is null)
        {
            if (string.Equals(_seed.AdminEmail.Trim(), SuperAdminEmail, StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(_seed.AdminPassword))
            {
                await EnsureBootstrapAdminAsync(cancellationToken);
                superAdmin = await _db.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == SuperAdminEmail, cancellationToken);

                if (superAdmin is null)
                {
                    _logger.LogWarning("Seed: bootstrap admin {Email} could not be loaded after creation.", SuperAdminEmail);
                    return;
                }
            }
            else
            {
                _logger.LogWarning("Seed: super admin user {Email} was not found.", SuperAdminEmail);
                return;
            }
        }

        await EnsureUserRoleAsync(superAdmin.Id, superAdminRole.Id, cancellationToken);
    }

    private async Task EnsureUserRoleAsync(
        int userId,
        int roleId,
        CancellationToken cancellationToken)
    {
        var exists = await _db.UserRoles.AnyAsync(
            ur => ur.UserId == userId && ur.RoleId == roleId,
            cancellationToken);

        if (exists)
            return;

        var now = DateTime.UtcNow;
        _db.UserRoles.Add(new UserRole
        {
            UserId = userId,
            RoleId = roleId,
            AssignedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        });

        await _db.SaveChangesAsync(cancellationToken);
    }
}
