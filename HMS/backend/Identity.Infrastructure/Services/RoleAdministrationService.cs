using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class RoleAdministrationService : IRoleAdministrationService
{
    private const string SuperAdminRole = "SuperAdmin";

    private readonly IHmsRepository _db;
    private readonly IUnitOfWork _unitOfWork;

    public RoleAdministrationService(
        IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedResponse<RoleDto>> ListRolesAsync(
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = _db.Query<Role>();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(role => role.Name.Contains(search));
        }

        return await query
            .OrderBy(role => role.Name)
            .Select(role => new RoleDto
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                PermissionNames = role.RolePermissions
                    .Select(rolePermission => rolePermission.Permission.Name)
                    .OrderBy(name => name)
                    .ToList()
            })
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<AdminOperationResult<RoleDto>> CreateRoleAsync(
        RoleUpsertDto request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return AdminOperationResult<RoleDto>.BadRequest("Role name is required.");

        if (await _db.Query<Role>().AnyAsync(role => role.Name == name, cancellationToken))
            return AdminOperationResult<RoleDto>.BadRequest("Role name is already used.");

        var (permissions, permissionFailure) = await GetPermissionsAsync(request.PermissionNames, cancellationToken);
        if (permissionFailure is not null)
            return AdminOperationResult<RoleDto>.BadRequest(permissionFailure.Message, permissionFailure.Missing);

        var now = DateTime.UtcNow;
        var role = new Role
        {
            Name = name,
            Description = request.Description?.Trim() ?? string.Empty,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Add(role);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        AddRolePermissions(role.Id, permissions, now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<RoleDto>.Success(Map(role, permissions));
    }

    public async Task<AdminOperationResult<RoleDto>> UpdateRoleAsync(
        int id,
        RoleUpsertDto request,
        CancellationToken cancellationToken)
    {
        var role = await _db.Query<Role>(asNoTracking: false)
            .Include(item => item.RolePermissions)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (role is null)
            return AdminOperationResult<RoleDto>.NotFound("Role not found.");

        if (role.Name == SuperAdminRole)
            return AdminOperationResult<RoleDto>.BadRequest("The SuperAdmin role is display-only and cannot be edited.");

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return AdminOperationResult<RoleDto>.BadRequest("Role name is required.");

        if (await _db.Query<Role>().AnyAsync(item => item.Id != id && item.Name == name, cancellationToken))
            return AdminOperationResult<RoleDto>.BadRequest("Role name is already used.");

        var (permissions, permissionFailure) = await GetPermissionsAsync(request.PermissionNames, cancellationToken);
        if (permissionFailure is not null)
            return AdminOperationResult<RoleDto>.BadRequest(permissionFailure.Message, permissionFailure.Missing);

        var now = DateTime.UtcNow;
        role.Name = name;
        role.Description = request.Description?.Trim() ?? string.Empty;
        role.UpdatedAt = now;

        _db.RemoveRange(role.RolePermissions);
        AddRolePermissions(role.Id, permissions, now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<RoleDto>.Success(Map(role, permissions));
    }

    public async Task<AdminOperationResult<RoleDto>> DeleteRoleAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var role = await _db.FirstOrDefaultAsync<Role>(
            item => item.Id == id,
            asNoTracking: false,
            cancellationToken);

        if (role is null)
            return AdminOperationResult<RoleDto>.NotFound("Role not found.");

        if (role.Name == SuperAdminRole)
            return AdminOperationResult<RoleDto>.BadRequest("The SuperAdmin role cannot be deleted.");

        if (await _db.Query<UserRole>().AnyAsync(userRole => userRole.RoleId == id, cancellationToken))
            return AdminOperationResult<RoleDto>.BadRequest("Role is assigned to users and cannot be deleted.");

        _db.Remove(role);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<RoleDto>.Success(new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description
        });
    }

    public async Task<RolePermissionsDto?> GetRolePermissionsAsync(
        int roleId,
        CancellationToken cancellationToken)
    {
        if (!await _db.Query<Role>().AnyAsync(role => role.Id == roleId, cancellationToken))
            return null;

        var names = await _db.Query<RolePermission>()
            .Where(rolePermission => rolePermission.RoleId == roleId)
            .Join(
                _db.Query<Permission>(),
                rolePermission => rolePermission.PermissionId,
                permission => permission.Id,
                (_, permission) => permission.Name)
            .OrderBy(name => name)
            .ToListAsync(cancellationToken);

        return new RolePermissionsDto
        {
            RoleId = roleId,
            PermissionNames = names
        };
    }

    public async Task<AdminOperationResult<RolePermissionsDto>> SetRolePermissionsAsync(
        int roleId,
        SetRolePermissionsDto request,
        CancellationToken cancellationToken)
    {
        var role = await _db.FirstOrDefaultAsync<Role>(
            item => item.Id == roleId,
            asNoTracking: false,
            cancellationToken);

        if (role is null)
            return AdminOperationResult<RolePermissionsDto>.NotFound("Role not found.");

        if (role.Name == SuperAdminRole)
            return AdminOperationResult<RolePermissionsDto>.BadRequest("The SuperAdmin role is display-only and cannot be edited.");

        var (permissions, permissionFailure) = await GetPermissionsAsync(request.PermissionNames, cancellationToken);
        if (permissionFailure is not null)
            return AdminOperationResult<RolePermissionsDto>.BadRequest(permissionFailure.Message, permissionFailure.Missing);

        var existing = await _db.Query<RolePermission>(asNoTracking: false)
            .Where(rolePermission => rolePermission.RoleId == roleId)
            .ToListAsync(cancellationToken);

        _db.RemoveRange(existing);

        var now = DateTime.UtcNow;
        AddRolePermissions(roleId, permissions, now);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return AdminOperationResult<RolePermissionsDto>.Success(new RolePermissionsDto
        {
            RoleId = roleId,
            PermissionNames = permissions.Select(permission => permission.Name).OrderBy(name => name).ToList()
        });
    }

    public async Task<IReadOnlyList<PermissionDto>> ListPermissionsAsync(
        CancellationToken cancellationToken)
    {
        return await _db.Query<Permission>()
            .OrderBy(permission => permission.Name)
            .Select(permission => new PermissionDto
            {
                Id = permission.Id,
                Name = permission.Name,
                Description = permission.Description
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<(List<Permission> Permissions, AdminOperationFailure? Failure)> GetPermissionsAsync(
        IReadOnlyCollection<string>? permissionNames,
        CancellationToken cancellationToken)
    {
        var names = (permissionNames ?? [])
            .Select(name => name.Trim())
            .Where(name => name.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (names.Count == 0)
            return ([], null);

        var permissions = await _db.Query<Permission>()
            .Where(permission => names.Contains(permission.Name))
            .ToListAsync(cancellationToken);

        if (permissions.Count == names.Count)
            return (permissions, null);

        var found = permissions.Select(permission => permission.Name).ToHashSet(StringComparer.Ordinal);
        var missing = names.Where(name => !found.Contains(name)).ToList();

        return ([], new AdminOperationFailure(
            AdminOperationFailureKind.BadRequest,
            "Unknown permission name(s).",
            missing));
    }

    private void AddRolePermissions(
        int roleId,
        IEnumerable<Permission> permissions,
        DateTime timestamp)
    {
        foreach (var permission in permissions)
        {
            _db.Add(new RolePermission
            {
                RoleId = roleId,
                PermissionId = permission.Id,
                CreatedAt = timestamp,
                UpdatedAt = timestamp
            });
        }
    }

    private static RoleDto Map(Role role, IEnumerable<Permission> permissions)
    {
        return new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            PermissionNames = permissions.Select(permission => permission.Name).OrderBy(name => name).ToList()
        };
    }
}
