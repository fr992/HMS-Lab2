using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
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

    public async Task<(CreatedUserResponse? user, string? error)> CreateUserAsync(
        CreateUserRequest request,
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
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
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
        return (new CreatedUserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            Roles = assignedNames
        }, null);
    }

    private static string? Validate(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
            return "UserName is required.";
        if (string.IsNullOrWhiteSpace(request.Email))
            return "Email is required.";
        if (string.IsNullOrWhiteSpace(request.FirstName))
            return "FirstName is required.";
        if (string.IsNullOrWhiteSpace(request.LastName))
            return "LastName is required.";
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            return "Password must be at least 8 characters.";
        if (request.RoleNames is null || request.RoleNames.Count == 0)
            return "At least one role is required.";
        return null;
    }
}