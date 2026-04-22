using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class UserManagementService : IUserManagementService
{
    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserManagementService(HmsDbContext db, IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<(CreatedUserResponseDto? user, string? error)> CreateUserAsync(
        CreateUserRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(request);
        if (validationError is not null)
            return (null, validationError);

        var userName = request.UserName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.UserName == userName, cancellationToken))
            return (null, "UserName is already taken.");

        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
            return (null, "Email is already registered.");

        var roleNames = request.RoleNames
            .Select(r => r.Trim())
            .Where(r => r.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var dbRoles = await _db.Roles.ToListAsync(cancellationToken);
        var roles = new List<Role>();
        foreach (var name in roleNames)
        {
            var match = dbRoles.FirstOrDefault(r => r.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (match is null)
                return (null, $"Unknown role: {name}");
            if (roles.All(r => r.Id != match.Id))
                roles.Add(match);
        }

        var user = new User
        {
            UserName = userName,
            Email = email,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedById = createdByUserId,
            UpdatedById = createdByUserId
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        foreach (var role in roles)
        {
            _db.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = createdByUserId,
                UpdatedById = createdByUserId
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        var assignedNames = roles.Select(r => r.Name).ToList();
        return (new CreatedUserResponseDto
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Roles = assignedNames
        }, null);
    }

    public async Task<(IReadOnlyList<UserListItemResponseDto>? items, string? error)> ListUsersAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u =>
                u.UserName.Contains(s)
                || u.Email.Contains(s));
        }

        var list = await query
            .OrderBy(u => u.UserName)
            .Select(u => new UserListItemResponseDto
            {
                Id = u.Id,
                UserName = u.UserName,
                Email = u.Email,
                IsActive = u.IsActive
            })
            .ToListAsync(cancellationToken);

        return (list, null);
    }

    public async Task<(UserDetailResponseDto? user, string? error)> GetUserByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.Users.AsNoTracking()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (entity is null)
            return (null, "User not found.");

        var dto = new UserDetailResponseDto
        {
            Id = entity.Id,
            UserName = entity.UserName,
            Email = entity.Email,
            IsActive = entity.IsActive,
            RoleNames = entity.UserRoles.Select(ur => ur.Role.Name).ToList()
        };

        return (dto, null);
    }

    public async Task<(UserDetailResponseDto? user, string? error)> UpdateUserAsync(
        int id,
        UpdateUserRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (entity is null)
            return (null, "User not found.");

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var email = request.Email.Trim().ToLowerInvariant();
            if (await _db.Users.AnyAsync(u => u.Email == email && u.Id != id, cancellationToken))
                return (null, "Email is already registered.");
            entity.Email = email;
        }

        entity.UpdatedAt = DateTime.UtcNow;

        if (request.RoleNames is not null && request.RoleNames.Count > 0)
        {
            var roleNames = request.RoleNames
                .Select(r => r.Trim())
                .Where(r => r.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var dbRoles = await _db.Roles.ToListAsync(cancellationToken);
            var roles = new List<Role>();
            foreach (var name in roleNames)
            {
                var match = dbRoles.FirstOrDefault(r => r.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
                if (match is null)
                    return (null, $"Unknown role: {name}");
                if (roles.All(r => r.Id != match.Id))
                    roles.Add(match);
            }

            var existingLinks = await _db.UserRoles.Where(ur => ur.UserId == id).ToListAsync(cancellationToken);
            _db.UserRoles.RemoveRange(existingLinks);

            foreach (var role in roles)
            {
                _db.UserRoles.Add(new UserRole
                {
                    UserId = entity.Id,
                    RoleId = role.Id,
                    AssignedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        return await GetUserByIdAsync(id, cancellationToken);
    }

    public async Task<(bool ok, string? error)> SetUserActiveAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (entity is null)
            return (false, "User not found.");

        entity.IsActive = isActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return (true, null);
    }

    private static string? Validate(CreateUserRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
            return "UserName is required.";
        if (string.IsNullOrWhiteSpace(request.Email))
            return "Email is required.";
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            return "Password must be at least 8 characters.";
        if (request.RoleNames is null || request.RoleNames.Count == 0)
            return "At least one role is required.";
        return null;
    }
}