using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IAuthService
{
    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}