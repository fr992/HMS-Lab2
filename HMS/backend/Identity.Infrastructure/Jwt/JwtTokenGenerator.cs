using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Identity.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Identity.Infrastructure.Jwt;

public sealed class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly JwtSettings _settings;

    public const string PermissionClaimType = "permission";

    public JwtTokenGenerator(IOptions<JwtSettings> options)
    {
        _settings = options.Value;
    }

    public (string Token, int ExpiresInSeconds) CreateAccessToken(
        User user, 
        IReadOnlyList<string> roleNames,
        IReadOnlyList<string> permissionNames)
    {
        if (string.IsNullOrWhiteSpace(_settings.Key) || _settings.Key.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");

        var expires = DateTime.UtcNow.AddMinutes(_settings.AccessTokenMinutes);
        var expiresIn = (int)(expires - DateTime.UtcNow).TotalSeconds;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roleNames)
            claims.Add(new Claim(ClaimTypes.Role, role));

        foreach (var p in permissionNames)
            claims.Add(new Claim(PermissionClaimType, p));

        if (permissionNames.Count > 0)
            claims.Add(new Claim("permissions", string.Join('|', permissionNames)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresIn);
    }
}