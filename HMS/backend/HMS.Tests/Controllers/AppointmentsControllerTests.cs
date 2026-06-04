using HMS.Api.Controllers.Clinical;
using HMS.Api.Controllers.Patients;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class AppointmentsControllerTests
{
    [Fact]
    public async Task MyAppointments_PassesCurrentUserAndPermissionsToService()
    {
        var service = new Mock<IAppointmentService>();
        var controller = new MyAppointmentsController(service.Object);
        var pagination = new PaginationQuery { Page = 1, PageSize = 20 };
        var response = PaginatedResponse<AppointmentDto>.Create([], 1, 20, 0);
        ControllerTestHelper.SetUser(controller, userId: 101, permissions: ["Own.Appointments.View"]);

        service
            .Setup(s => s.GetAppointmentsAsync(
                101,
                It.Is<IEnumerable<string>>(permissions => permissions.Contains("Own.Appointments.View")),
                null,
                null,
                null,
                "scheduled",
                pagination,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await controller.GetMyAppointments(null, null, null, "scheduled", pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task DoctorAppointments_UpdateStatus_PassesCurrentUserToService()
    {
        var service = new Mock<IAppointmentService>();
        var controller = new DoctorAppointmentsController(service.Object);
        var request = new UpdateAppointmentStatusDto { Status = "Completed" };
        var appointment = new AppointmentDto { Id = 70, Status = request.Status };
        ControllerTestHelper.SetUser(controller, userId: 202, permissions: ["Appointments.ManageStatus"]);

        service
            .Setup(s => s.UpdateStatusAsync(70, request, 202, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        var result = await controller.UpdateStatus(70, request, CancellationToken.None);

        Assert.Same(appointment, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task DoctorAppointments_Get_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        var service = new Mock<IAppointmentService>();
        var controller = new DoctorAppointmentsController(service.Object);
        ControllerTestHelper.SetUser(controller, userId: 202);

        service
            .Setup(s => s.GetAppointmentsAsync(
                202,
                It.IsAny<IEnumerable<string>>(),
                null,
                null,
                null,
                null,
                It.IsAny<PaginationQuery>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Invalid range."));

        var result = await controller.GetDoctorAppointments(null, null, null, null, new PaginationQuery(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
