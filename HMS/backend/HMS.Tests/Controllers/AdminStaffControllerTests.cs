using HMS.Api.Controllers.Admin;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class AdminStaffControllerTests
{
    [Fact]
    public async Task CreateDoctor_PassesCurrentUserAndReturnsCreated()
    {
        var staffProfiles = new Mock<IStaffProfileService>();
        var controller = new AdminStaffController(staffProfiles.Object);
        var request = new CreateDoctorStaffRequestDto { UserName = "dr.new", Email = "dr.new@hms.test" };
        var doctor = new DoctorProfileDto { Id = 8, LicenseNumber = "DOC-8" };
        ControllerTestHelper.SetUser(controller, userId: 15, roles: ["SuperAdmin"], permissions: ["Users.Create"]);
        staffProfiles
            .Setup(service => service.CreateDoctorAsync(request, 15, It.IsAny<CancellationToken>()))
            .ReturnsAsync((doctor, null));

        var result = await controller.CreateDoctor(request, CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal("/api/doctors/8", created.Location);
        Assert.Same(doctor, created.Value);
    }

    [Fact]
    public async Task CreateNurse_WhenServiceReturnsError_ReturnsBadRequest()
    {
        var staffProfiles = new Mock<IStaffProfileService>();
        var controller = new AdminStaffController(staffProfiles.Object);
        ControllerTestHelper.SetUser(controller, userId: 15, roles: ["SuperAdmin"]);
        staffProfiles
            .Setup(service => service.CreateNurseAsync(It.IsAny<CreateNurseStaffRequestDto>(), 15, It.IsAny<CancellationToken>()))
            .ReturnsAsync((null, "License number already exists."));

        var result = await controller.CreateNurse(new CreateNurseStaffRequestDto(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateGeneralStaff_WhenSuccessful_ReturnsCreated()
    {
        var staffProfiles = new Mock<IStaffProfileService>();
        var controller = new AdminStaffController(staffProfiles.Object);
        var staff = new StaffProfileDto { Id = 3, StaffNumber = "S-003" };
        ControllerTestHelper.SetUser(controller, userId: 20, roles: ["SuperAdmin"]);
        staffProfiles
            .Setup(service => service.CreateGeneralStaffAsync(It.IsAny<CreateGeneralStaffRequestDto>(), 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync((staff, null));

        var result = await controller.CreateGeneralStaff(new CreateGeneralStaffRequestDto(), CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal("/api/admin/staff/3", created.Location);
    }
}
