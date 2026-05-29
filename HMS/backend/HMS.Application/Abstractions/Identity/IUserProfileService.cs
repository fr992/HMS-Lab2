using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity

{
    public interface IUserProfileService
    {
        Task<UserProfileDto> GetProfileInfoAsync(int actorUserId, CancellationToken cancellationToken);
        Task<UserProfileDto> UpdateProfileInfoAsync(int actorUserId, UserProfileUpdateDto request, CancellationToken cancellationToken);
    }
}
