using HMS.Api.Controllers;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class AuthControllerTests
{
    private readonly Mock<IAuthService> _authService = new();
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _controller = new AuthController(_authService.Object, NullLogger<AuthController>.Instance);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext()
        };
    }

    [Fact]
    public async Task Login_WhenCredentialsValid_ReturnsTokenResponse()
    {
        var request = new LoginRequestDto { UserNameOrEmail = "admin@hms.test", Password = "secret" };
        var response = new AuthResponseDto
        {
            AccessToken = "access",
            RefreshToken = "refresh",
            UserId = 9,
            Roles = ["Admin"]
        };
        _authService
            .Setup(service => service.LoginAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.Login(request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public async Task Login_WhenCredentialsInvalid_ReturnsUnauthorized()
    {
        var request = new LoginRequestDto { UserNameOrEmail = "missing@hms.test", Password = "bad" };
        _authService
            .Setup(service => service.LoginAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AuthResponseDto?)null);

        var result = await _controller.Login(request, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task Refresh_WhenRefreshTokenValid_ReturnsTokenResponse()
    {
        var request = new RefreshRequestDto { RefreshToken = "refresh" };
        var response = new AuthResponseDto
        {
            AccessToken = "access-2",
            RefreshToken = "refresh-2",
            UserId = 10,
            Roles = ["Receptionist"]
        };
        _authService
            .Setup(service => service.RefreshTokenAsync("refresh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.Refresh(request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public async Task Refresh_WhenRefreshTokenInvalid_ReturnsUnauthorized()
    {
        _authService
            .Setup(service => service.RefreshTokenAsync("expired", It.IsAny<CancellationToken>()))
            .ReturnsAsync((AuthResponseDto?)null);

        var result = await _controller.Refresh(new RefreshRequestDto { RefreshToken = "expired" }, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }
}
