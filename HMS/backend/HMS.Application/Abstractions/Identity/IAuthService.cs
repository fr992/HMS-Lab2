using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);

    Task<AuthResponseDto?> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default); 
}