using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IUserManagementService
{
    Task<(CreatedUserResponse? user, string? error)> CreateUserAsync(
        CreateUserRequest request,
        int? createdByUserId,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<UserListItemResponse>? items, string? error)> ListUsersAsync(
        string? search,
        CancellationToken cancellationToken = default);
    Task<(UserDetailResponse? user, string? error)> GetUserByIdAsync(
        int id,
        CancellationToken cancellationToken = default);
    Task<(UserDetailResponse? user, string? error)> UpdateUserAsync(
        int id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default);
    Task<(bool ok, string? error)> SetUserActiveAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken = default);
}