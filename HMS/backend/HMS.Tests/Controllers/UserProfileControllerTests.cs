using HMS.Api.Controllers;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class UserProfileControllerTests
{
    [Fact]
    public async Task GetProfile_PassesCurrentUser()
    {
        var service = new Mock<IUserProfileService>();
        var controller = new UserProfileController(service.Object);
        var profile = new UserProfileDto { Name = "Ana" };
        ControllerTestHelper.SetUser(controller, userId: 84);
        service
            .Setup(s => s.GetProfileInfoAsync(84, It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        var result = await controller.GetProfile(CancellationToken.None);

        Assert.Same(profile, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetProfile_WhenUserMissing_ReturnsUnauthorized()
    {
        var controller = new UserProfileController(Mock.Of<IUserProfileService>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var result = await controller.GetProfile(CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task UpdateProfile_PassesCurrentUserAndRequest()
    {
        var service = new Mock<IUserProfileService>();
        var controller = new UserProfileController(service.Object);
        var request = new UserProfileUpdateDto { Name = "Updated" };
        var profile = new UserProfileDto { Name = request.Name };
        ControllerTestHelper.SetUser(controller, userId: 85);
        service
            .Setup(s => s.UpdateProfileInfoAsync(85, request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        var result = await controller.UpdateProfile(request, CancellationToken.None);

        Assert.Same(profile, ControllerTestHelper.AssertOkValue(result));
    }
}
