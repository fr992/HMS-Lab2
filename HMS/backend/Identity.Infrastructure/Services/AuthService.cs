using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Identity.Domain.Entities;
using Identity.Infrastructure.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography; 
using System.Text;                  


namespace Identity.Infrastructure.Services;

public sealed class AuthService : IAuthService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenGenerator _jwt;

    
    private string ComputeHash(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    public AuthService(IHmsRepository db,
        IUnitOfWork unitOfWork, IPasswordHasher<User> passwordHasher, IJwtTokenGenerator jwt)
    {
        _db = db;

        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwt = jwt;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var login = request.UserNameOrEmail.Trim();
        if (string.IsNullOrEmpty(login) || string.IsNullOrEmpty(request.Password))
            return null;

        var loginLower = login.ToLowerInvariant();

        var user = await _db.Query<User>()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(
                u => u.UserName == login || u.Email.ToLower() == loginLower,
                cancellationToken);

        if (user is null || !user.IsActive)
            return null;

        var result = _passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password
        );

        if (result == PasswordVerificationResult.Failed)
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var roleIds = user.UserRoles.Select(ur => ur.RoleId).ToList();
        var permissions = await GetDistinctPermissionNamesForRolesAsync(roleIds, cancellationToken);

        var (token, expiresIn) = _jwt.CreateAccessToken(user, roles, permissions);

        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var tokenHash = ComputeHash(refreshToken);

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _db.Add<RefreshToken>(refreshTokenEntity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            AccessToken = token,
            RefreshToken = refreshToken,
            ExpiresInSeconds = expiresIn,
            UserId = user.Id,
            UserName = user.UserName,
            Roles = roles
        };
    }

    public async Task<AuthResponseDto?> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = ComputeHash(refreshToken);

        var tokenEntity = await _db.Query<RefreshToken>()
            .Include(r => r.User)
            .ThenInclude(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, cancellationToken);

        if (tokenEntity == null || tokenEntity.RevokedAt != null || tokenEntity.ExpiresAt < DateTime.UtcNow)
            return null;

        var user = tokenEntity.User;

        if (!user.IsActive)
            return null;

        var roles = user.UserRoles.Select(r => r.Role.Name).ToList();
                var roleIds = user.UserRoles.Select(ur => ur.RoleId).ToList();
        var permissions = await GetDistinctPermissionNamesForRolesAsync(roleIds, cancellationToken);

        var (newAccessToken, expiresIn) = _jwt.CreateAccessToken(user, roles, permissions);

        
        tokenEntity.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var newTokenHash = ComputeHash(newRefreshToken);

        var newToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _db.Add<RefreshToken>(newToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresInSeconds = expiresIn,
            UserId = user.Id,
            UserName = user.UserName,
            Roles = roles
        };
    }

    private async Task<List<string>> GetDistinctPermissionNamesForRolesAsync(
    IReadOnlyCollection<int> roleIds,
    CancellationToken cancellationToken)
{
    if (roleIds.Count == 0)
        return [];

    return await _db.Query<RolePermission>().AsNoTracking()
        .Where(rp => roleIds.Contains(rp.RoleId))
        .Select(rp => rp.Permission.Name)
        .Distinct()
        .ToListAsync(cancellationToken);
}
    
}
