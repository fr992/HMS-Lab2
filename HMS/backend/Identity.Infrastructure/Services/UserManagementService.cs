using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Identity.Infrastructure.Common;
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

        if (roleNames.Any(name => name.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)))
            return (null, "SuperAdmin cannot be assigned from user management.");

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

    public async Task<(UserListResponseDto? items, string? error)> ListUsersAsync(
        string? search,
        string? role,
        string? status,
        bool staffOnly,
        PaginationQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u =>
                u.UserName.Contains(s)
                || u.Email.Contains(s)
                || (u.Person != null && (
                    u.Person.FirstName.Contains(s)
                    || u.Person.LastName.Contains(s)
                    || (u.Person.Phone != null && u.Person.Phone.Contains(s)))));
        }

        if (!string.IsNullOrWhiteSpace(role) && !role.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var roleName = role.Trim();
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == roleName));
        }
        else if (staffOnly)
        {
            var staffRoles = new[]
            {
                "Doctor",
                "Nurse",
                "Infermier",
                "Laboratorant",
                "Lab",
                "LabStaff",
                "Laboratory",
                "Receptionist",
                "Reception",
                "Admin",
                "SuperAdmin"
            };
            query = query.Where(u => u.UserRoles.Any(ur => staffRoles.Contains(ur.Role.Name)));
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            if (normalizedStatus is not ("active" or "inactive"))
                return (null, "Invalid user status filter.");

            var isActive = normalizedStatus == "active";
            query = query.Where(u => u.IsActive == isActive);
        }

        var stats = new UserListStatsDto
        {
            TotalUsers = await query.CountAsync(cancellationToken),
            ActiveUsers = await query.CountAsync(u => u.IsActive, cancellationToken),
            InactiveUsers = await query.CountAsync(u => !u.IsActive, cancellationToken),
            SuperAdmins = await query.CountAsync(
                u => u.UserRoles.Any(ur => ur.Role.Name == "SuperAdmin"),
                cancellationToken)
        };

        var pageNumber = pagination.Page;
        var pageSize = pagination.PageSize;
        var pageItems = await query
            .OrderBy(u => u.UserName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserListItemResponseDto
            {
                Id = u.Id,
                UserName = u.UserName,
                Email = u.Email,
                FirstName = u.Person == null ? null : u.Person.FirstName,
                LastName = u.Person == null ? null : u.Person.LastName,
                PhoneNumber = u.Person == null ? null : u.Person.Phone,
                IsActive = u.IsActive,
                RoleNames = u.UserRoles.Select(ur => ur.Role.Name).OrderBy(n => n).ToList()
            })
            .ToListAsync(cancellationToken);
        var page = PaginatedResponse<UserListItemResponseDto>.Create(
            pageItems,
            pageNumber,
            pageSize,
            stats.TotalUsers);

        return (UserListResponseDto.Create(page, stats), null);
    }

    public async Task<(UserDetailResponseDto? user, string? error)> GetUserByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.Users.AsNoTracking()
            .Include(u => u.Person)
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
            FirstName = entity.Person?.FirstName,
            LastName = entity.Person?.LastName,
            PhoneNumber = entity.Person?.Phone,
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
            .Include(u => u.Person)
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

        if (request.IsActive.HasValue)
            entity.IsActive = request.IsActive.Value;

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Length < 8)
                return (null, "Password must be at least 8 characters.");

            entity.PasswordHash = _passwordHasher.HashPassword(entity, request.NewPassword);
        }

        if (request.FirstName is not null || request.LastName is not null || request.PhoneNumber is not null)
        {
            entity.Person ??= new Person
            {
                UserId = entity.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (request.FirstName is not null)
                entity.Person.FirstName = request.FirstName.Trim();
            if (request.LastName is not null)
                entity.Person.LastName = request.LastName.Trim();
            if (request.PhoneNumber is not null)
                entity.Person.Phone = string.IsNullOrWhiteSpace(request.PhoneNumber)
                    ? null
                    : request.PhoneNumber.Trim();

            entity.Person.UpdatedAt = DateTime.UtcNow;
        }

        entity.UpdatedAt = DateTime.UtcNow;

        if (request.RoleNames is not null)
        {
            var roleNames = request.RoleNames
                .Select(r => r.Trim())
                .Where(r => r.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (roleNames.Count == 0)
                return (null, "At least one role is required.");

            if (roleNames.Any(name => name.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)))
                return (null, "SuperAdmin cannot be assigned from user management.");

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
