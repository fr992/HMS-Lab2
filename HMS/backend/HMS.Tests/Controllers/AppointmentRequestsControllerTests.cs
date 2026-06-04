using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class AppointmentRequestsControllerTests
{
    private readonly Mock<IAppointmentRequestService> _appointmentRequestService = new();
    private readonly AppointmentRequestsController _controller;

    public AppointmentRequestsControllerTests()
    {
        _controller = new AppointmentRequestsController(_appointmentRequestService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 81, permissions: ["Appointments.Read"]);
    }

    [Fact]
    public async Task GetAll_PassesCurrentUserPermissionsAndFiltersToService()
    {
        var pagination = new PaginationQuery { Page = 1, PageSize = 25 };
        var preferredDate = new DateOnly(2026, 6, 4);
        var response = PaginatedResponse<AppointmentRequestDto>.Create(
            [new AppointmentRequestDto { Id = 1, Status = "Pending" }],
            page: 1,
            pageSize: 25,
            totalCount: 1);
        _appointmentRequestService
            .Setup(service => service.GetAllAsync(
                81,
                It.Is<IEnumerable<string>>(permissions => permissions.Contains("Appointments.Read")),
                "Pending",
                preferredDate,
                pagination,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.GetAll("Pending", preferredDate, pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetAll_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        _appointmentRequestService
            .Setup(service => service.GetAllAsync(
                81,
                It.IsAny<IEnumerable<string>>(),
                null,
                null,
                It.IsAny<PaginationQuery>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Invalid status."));

        var result = await _controller.GetAll(null, null, new PaginationQuery(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetById_WhenMissing_ReturnsNotFound()
    {
        _appointmentRequestService
            .Setup(service => service.GetByIdAsync(
                404,
                81,
                It.Is<IEnumerable<string>>(permissions => permissions.Contains("Appointments.Read")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((AppointmentRequestDto?)null);

        var result = await _controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedRequest()
    {
        var request = new CreateAppointmentRequestDto
        {
            FirstName = "Marta",
            LastName = "Simon",
            Email = "marta@example.test",
            PreferredDate = new DateOnly(2026, 6, 10)
        };
        var created = new AppointmentRequestDto { Id = 22, FirstName = request.FirstName };
        _appointmentRequestService
            .Setup(service => service.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(created);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(created, ControllerTestHelper.AssertCreatedValue(result, nameof(AppointmentRequestsController.GetById)));
    }

    [Fact]
    public async Task Create_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        _appointmentRequestService
            .Setup(service => service.CreateAsync(It.IsAny<CreateAppointmentRequestDto>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Doctor is unavailable."));

        var result = await _controller.Create(new CreateAppointmentRequestDto(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_PassesCurrentUserAndReturnsUpdatedRequest()
    {
        var request = new UpdateAppointmentRequestStatusDto { Status = "Approved", DoctorProfileId = 9 };
        var updated = new AppointmentRequestDto { Id = 33, Status = request.Status };
        _appointmentRequestService
            .Setup(service => service.UpdateStatusAsync(33, request, 81, It.IsAny<CancellationToken>()))
            .ReturnsAsync(updated);

        var result = await _controller.UpdateStatus(33, request, CancellationToken.None);

        Assert.Same(updated, ControllerTestHelper.AssertOkValue(result));
    }
}
