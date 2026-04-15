using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IUserManagementService
{
    Task<(CreatedUserResponse? user, string? error)> CreateUserAsync(
        CreateUserRequest request,
        int? createdByUserId,
        CancellationToken cancellationToken = default);
}