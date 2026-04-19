using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IUserManagementService
{
    Task<(CreatedUserResponseDto? user, string? error)> CreateUserAsync(
        CreateUserRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<UserListItemResponseDto>? items, string? error)> ListUsersAsync(
        string? search,
        CancellationToken cancellationToken = default);
    Task<(UserDetailResponseDto? user, string? error)> GetUserByIdAsync(
        int id,
        CancellationToken cancellationToken = default);
    Task<(UserDetailResponseDto? user, string? error)> UpdateUserAsync(
        int id,
        UpdateUserRequestDto request,
        CancellationToken cancellationToken = default);
    Task<(bool ok, string? error)> SetUserActiveAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken = default);
}