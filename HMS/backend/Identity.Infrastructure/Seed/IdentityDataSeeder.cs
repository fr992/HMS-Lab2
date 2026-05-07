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
    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly SeedSettings _seed;
    private readonly ILogger<IdentityDataSeeder> _logger;

    private static readonly string[] RoleNames =
    {
        "Admin",
        "Doctor",
        "Nurse",
        "Patient",
        "Receptionist",
        "Laboratorant"
    };

    private static readonly (string Name, string Description)[] PermissionDefinitions =
    {
        ("Users.Create", "Krijon përdorues stafi (mjekë, infermierë, recepsionistë, laboratorantë)."),
        ("Users.Read", "Lexon përdoruesit."),
        ("Users.Update", "Përditëson përdoruesit."),
        ("Users.SetActive", "Aktivizon ose çaktivizon përdorues."),
        ("Roles.Read", "Lexon rolet."),
        ("Permissions.Read", "Lexon listën e lejeve."),
        ("RolePermissions.Manage", "Cakton ose heq leje nga rolet."),
        ("AuditLogs.Read", "Lexon audit log."),
        ("Settings.Manage", "Menaxhon cilësimet e sistemit."),
        ("Patients.Register", "Regjistron pacient të ri dhe përdorues portal (recepsion)."),
        ("Patients.Read", "Lexon të dhënat e pacientit."),
        ("Patients.Update", "Përditëson të dhënat e pacientit."),
        ("Patients.Delete", "Fshin të dhënat e pacientit."),
        ("Appointments.Read", "Sheh terminet dhe oraret."),
        ("Appointments.Create", "Krijon termin për pacient."),
        ("Appointments.ManageStatus", "Aprovon, refuzon ose ndryshon statusin e terminit."),
        ("Invoices.Read", "Sheh faturat."),
        ("Payments.ConfirmCash", "Konfirmon pagesën në para."),
        ("LabResults.Read", "Lexon rezultate laboratori (p.sh. recepsion)."),
        ("Encounters.Create", "Fillon vizitë (Encounter)."),
        ("Encounters.Read", "Lexon encounter."),
        ("Encounters.Update", "Përditëson encounter gjatë vizitës."),
        ("Encounters.Close", "Mbyll vizitën."),
        ("LabRequests.Create", "Krijon kërkesë laboratori nga vizita."),
        ("Diagnoses.Manage", "Menaxhon diagnozat e lidhura me encounter."),
        ("Prescriptions.Read", "Lexon recetat."),
        ("Prescriptions.Create", "Krijon receta."),
        ("Prescriptions.Update", "Përditëson statusin e recetës."),
        ("Prescriptions.Delete", "Fshin receta."),
        ("Medications.Read", "Lexon barnat."),
        ("Medications.Create", "Krijon barna."),
        ("Medications.Update", "Përditëson barna."),
        ("Medications.Delete", "Fshin barna."),
        ("LabTests.Read", "Lexon katalogun e testeve laboratorike."),
        ("LabTests.Create", "Krijon teste laboratorike."),
        ("LabTests.Update", "Përditëson teste laboratorike."),
        ("LabTests.Delete", "Çaktivizon teste laboratorike."),
        ("NurseTasks.Assign", "Cakton detyra infermierit."),
        ("NurseTasks.Read", "Sheh detyrat e caktuara."),
        ("NurseTasks.Complete", "Shënon detyrën si të kryer."),
        ("LabRequests.Read", "Sheh kërkesat laboratorike."),
        ("LabRequests.UpdateStatus", "Përditëson statusin e kërkesës laboratorike."),
        ("LabResults.Create", "Plotëson rezultatin laboratorik."),
        ("LabResults.Publish", "Publikon rezultatin për pacientin."),
        ("Own.Appointments.View", "Pacienti sheh terminet e veta."),
        ("Own.Appointments.Request", "Pacienti kërkon termin të ri (pa aprovim vetjak)."),
        ("Own.MedicalHistory.View", "Pacienti sheh historikun mjekësor."),
        ("Own.LabResults.View", "Pacienti sheh rezultatet e analizave."),
        ("Own.LabResults.Download", "Pacienti shkarkon PDF të rezultatit."),
        ("Own.Invoices.View", "Pacienti sheh faturat."),
        ("Own.Payments.PayOnline", "Pacienti paguan online."),
        ("Own.Notifications.View", "Pacienti sheh njoftimet.")
    };

    private static readonly (string RoleName, string[] PermissionNames)[] RolePermissionMap =
    {
        ("Admin", new[]
        {
            "Users.Create", "Users.Read", "Users.Update", "Users.SetActive",
            "Roles.Read", "Permissions.Read", "Patients.Register", "Patients.Read", "Patients.Update", "Patients.Delete", "RolePermissions.Manage",
            "AuditLogs.Read", "Settings.Manage",

            "Appointments.Read", "Appointments.Create", "Appointments.ManageStatus",

            "Encounters.Create", "Encounters.Read", "Encounters.Update", "Encounters.Close",

            "Diagnoses.Manage",

            "Prescriptions.Read", "Prescriptions.Create", "Prescriptions.Update", "Prescriptions.Delete",

            "Medications.Read", "Medications.Create", "Medications.Update", "Medications.Delete",

            "LabTests.Read", "LabTests.Create", "LabTests.Update", "LabTests.Delete",

            "LabRequests.Read", "LabRequests.Create", "LabRequests.UpdateStatus",
        }),
        ("Receptionist", new[]
        {
            "Patients.Register", "Patients.Read", "Patients.Update", "Patients.Delete",
            "Appointments.Read", "Appointments.Create", "Appointments.ManageStatus",
            "Invoices.Read", "Payments.ConfirmCash",
            "LabResults.Read",
            "LabTests.Read"
        }),
        ("Doctor", new[]
        {
            "Patients.Read",
            "Appointments.Read",

            "Encounters.Create", "Encounters.Read", "Encounters.Update", "Encounters.Close",

            "Diagnoses.Manage", 

            "Prescriptions.Read", "Prescriptions.Create", "Prescriptions.Update",

            "Medications.Read",

            "LabTests.Read",

            "LabRequests.Create",
            "NurseTasks.Assign",
            "LabResults.Create"
        }),
        ("Nurse", new[]
        {
            "NurseTasks.Read", "NurseTasks.Complete"
        }),
        ("Laboratorant", new[]
        {
            "LabTests.Read",
            "LabRequests.Read", "LabRequests.UpdateStatus",
            "LabResults.Create", "LabResults.Publish"
        }),
        ("Patient", new[]
        {
            "Own.Appointments.View", "Own.Appointments.Request",
            "Own.MedicalHistory.View",
            "Own.LabResults.View", "Own.LabResults.Download",
            "Own.Invoices.View", "Own.Payments.PayOnline",
            "Own.Notifications.View"
        })
    };

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

        await EnsureSampleAuditLogsIfEmptyAsync(cancellationToken);
    }

    private async Task EnsureSampleAuditLogsIfEmptyAsync(CancellationToken cancellationToken)
    {
        if (await _db.AuditLogs.AnyAsync(cancellationToken))
            return;

        var now = DateTime.UtcNow;
        var admin = await _db.Users.OrderBy(u => u.Id).FirstOrDefaultAsync(cancellationToken);

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = null,
            Action = "Seed.Completed",
            Entity = "Database",
            EntityId = null,
            OldValue = null,
            NewValue = "Initial roles and permissions are ready.",
            IpAddress = null,
            CreatedAt = now,
            UpdatedAt = now
        });

        if (admin is not null)
        {
            _db.AuditLogs.Add(new AuditLog
            {
                UserId = admin.Id,
                Action = "User.Bootstrap",
                Entity = "User",
                EntityId = admin.Id,
                OldValue = null,
                NewValue = admin.UserName,
                IpAddress = null,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded sample audit log entries (table was empty).");
    }

    private async Task EnsureRolesAsync(CancellationToken cancellationToken)
    {
        var descriptions = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Admin"] = "Menaxhon sistemin, përdoruesit dhe caktimin e lejeve.",
            ["Doctor"] = "Procesi mjekësor: vizita, diagnozë, terapi, laborator, detyra infermierit.",
            ["Nurse"] = "Ekzekuton detyrat e caktuara nga mjeku.",
            ["Patient"] = "Portal: termine, historik, analiza, pagesa, njoftime.",
            ["Receptionist"] = "Front desk: pacientë, termine, pagesa cash, (ops.) rezultate.",
            ["Laboratorant"] = "Analiza laboratorike: kërkesa, rezultate, publikim."
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
        foreach (var (name, description) in PermissionDefinitions)
        {
            if (await _db.Permissions.AnyAsync(p => p.Name == name, cancellationToken))
                continue;

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

        foreach (var (roleName, permissionNames) in RolePermissionMap)
        {
            if (!roles.TryGetValue(roleName, out var roleId))
            {
                _logger.LogWarning("Seed: role {RoleName} not found; skipping its permissions.", roleName);
                continue;
            }

            foreach (var permName in permissionNames)
            {
                if (!permissions.TryGetValue(permName, out var permissionId))
                {
                    _logger.LogWarning("Seed: permission {PermName} not found; skipping link for {RoleName}.", permName, roleName);
                    continue;
                }

                var exists = await _db.RolePermissions.AnyAsync(
                    rp => rp.RoleId == roleId && rp.PermissionId == permissionId,
                    cancellationToken);

                if (exists) continue;

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

        var hasAdminUser = await _db.UserRoles.AnyAsync(ur => ur.RoleId == adminRole.Id, cancellationToken);
        if (hasAdminUser)
            return;

        var email = _seed.AdminEmail.Trim().ToLowerInvariant();
        var userName = _seed.AdminUserName.Trim();

        if (await _db.Users.AnyAsync(u => u.Email == email || u.UserName == userName, cancellationToken))
        {
            _logger.LogWarning("Users already exist but none had Admin role; link Admin manually or fix data.");
            return;
        }

        // Step 1 — Create User (auth only)
        var user = new User
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

        // Step 2 — Create Person linked to User
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

        // Step 3 — Assign Admin role
        _db.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = adminRole.Id,
            AssignedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Bootstrap admin user {UserName} created.", userName);
    }
}
