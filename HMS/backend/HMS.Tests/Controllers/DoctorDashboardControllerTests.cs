using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class DoctorDashboardControllerTests
{
    [Fact]
    public async Task Get_PassesCurrentUserRolesAndReturnsDashboard()
    {
        var service = new Mock<IDoctorDashboardService>();
        var controller = new DoctorDashboardController(service.Object);
        var dashboard = new DoctorDashboardDto();
        ControllerTestHelper.SetUser(controller, userId: 71, roles: ["Doctor"], permissions: ["Patients.Read"]);
        service
            .Setup(s => s.GetForCurrentDoctorAsync(
                71,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(dashboard);

        var result = await controller.Get(CancellationToken.None);

        Assert.Same(dashboard, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Get_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        var service = new Mock<IDoctorDashboardService>();
        var controller = new DoctorDashboardController(service.Object);
        ControllerTestHelper.SetUser(controller, userId: 71, roles: ["Doctor"], permissions: ["Patients.Read"]);
        service
            .Setup(s => s.GetForCurrentDoctorAsync(71, It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Doctor profile not found."));

        var result = await controller.Get(CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
