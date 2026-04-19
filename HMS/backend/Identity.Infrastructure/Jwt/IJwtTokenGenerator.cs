using Identity.Domain.Entities;

namespace Identity.Infrastructure.Jwt;

public interface IJwtTokenGenerator
{
    (string Token, int ExpiresInSeconds) CreateAccessToken(
        User user, 
        IReadOnlyList<string> roleNames,
        IReadOnlyList<string> permissionNames);
}