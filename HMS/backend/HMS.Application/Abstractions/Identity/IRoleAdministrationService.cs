using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IRoleAdministrationService
{
    Task<PaginatedResponse<RoleDto>> ListRolesAsync(
        PaginationQuery pagination,
        CancellationToken cancellationToken);

    Task<AdminOperationResult<RoleDto>> CreateRoleAsync(
        RoleUpsertDto request,
        CancellationToken cancellationToken);

    Task<AdminOperationResult<RoleDto>> UpdateRoleAsync(
        int id,
        RoleUpsertDto request,
        CancellationToken cancellationToken);

    Task<AdminOperationResult<RoleDto>> DeleteRoleAsync(
        int id,
        CancellationToken cancellationToken);

    Task<RolePermissionsDto?> GetRolePermissionsAsync(
        int roleId,
        CancellationToken cancellationToken);

    Task<AdminOperationResult<RolePermissionsDto>> SetRolePermissionsAsync(
        int roleId,
        SetRolePermissionsDto request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PermissionDto>> ListPermissionsAsync(
        CancellationToken cancellationToken);
}

public sealed record AdminOperationResult<T>(
    T? Value,
    AdminOperationFailure? Failure)
{
    public static AdminOperationResult<T> Success(T value) => new(value, null);

    public static AdminOperationResult<T> NotFound(string message) =>
        new(default, new AdminOperationFailure(AdminOperationFailureKind.NotFound, message, []));

    public static AdminOperationResult<T> BadRequest(
        string message,
        IReadOnlyList<string>? missing = null) =>
        new(default, new AdminOperationFailure(AdminOperationFailureKind.BadRequest, message, missing ?? []));
}

public sealed record AdminOperationFailure(
    AdminOperationFailureKind Kind,
    string Message,
    IReadOnlyList<string> Missing);

public enum AdminOperationFailureKind
{
    BadRequest,
    NotFound
}
