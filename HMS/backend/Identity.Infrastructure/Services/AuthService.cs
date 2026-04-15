using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Identity.Infrastructure.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class AuthService : IAuthService
{
    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenGenerator _jwt;

    public AuthService(HmsDbContext db, IPasswordHasher<User> passwordHasher, IJwtTokenGenerator jwt)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwt = jwt;
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var login = request.UserNameOrEmail.Trim();
        if (string.IsNullOrEmpty(login) || string.IsNullOrEmpty(request.Password))
            return null;

        var loginLower = login.ToLowerInvariant();

        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(
                u => u.UserName == login || u.Email.ToLower() == loginLower,
                cancellationToken);

        if (user is null || !user.IsActive)
            return null;

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed)
            return null;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var (token, expiresIn) = _jwt.CreateAccessToken(user, roles);

        return new AuthResponse
        {
            AccessToken = token,
            ExpiresInSeconds = expiresIn,
            UserId = user.Id,
            UserName = user.UserName,
            Roles = roles
        };
    }
}