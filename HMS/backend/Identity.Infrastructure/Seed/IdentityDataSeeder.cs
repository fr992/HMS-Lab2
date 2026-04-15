using Identity.Domain.Entities;
using HMS.Persistence;
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
            await EnsureRolesAsync(cancellationToken);

        if (_seed.EnsureBootstrapAdmin && !string.IsNullOrWhiteSpace(_seed.AdminPassword))
            await EnsureBootstrapAdminAsync(cancellationToken);
        else if (_seed.EnsureBootstrapAdmin && string.IsNullOrWhiteSpace(_seed.AdminPassword))
            _logger.LogWarning("Seed:AdminPassword is empty; bootstrap admin was not created.");
    }

    private async Task EnsureRolesAsync(CancellationToken cancellationToken)
    {
        var names = new[] { "Admin", "Doctor", "Nurse", "LabTech", "Staff" };
        foreach (var name in names)
        {
            if (await _db.Roles.AnyAsync(r => r.Name == name, cancellationToken))
                continue;

            _db.Roles.Add(new Role
            {
                Name = name,
                Description = name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
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

        var user = new User
        {
            UserName = userName,
            Email = email,
            FirstName = _seed.AdminFirstName,
            LastName = _seed.AdminLastName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, _seed.AdminPassword);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

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