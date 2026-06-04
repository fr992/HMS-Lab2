using HMS.Api.Controllers.Receptionist;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class ReceptionAppointmentsControllerTests
{
    private readonly Mock<IAppointmentService> _appointmentService = new();
    private readonly Mock<IDataTransferService> _dataTransferService = new();
    private readonly AppointmentsController _controller;

    public ReceptionAppointmentsControllerTests()
    {
        _controller = new AppointmentsController(_appointmentService.Object, _dataTransferService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 88, permissions: ["Appointments.Read", "Appointments.Create"]);
    }

    [Fact]
    public async Task GetAppointments_PassesCurrentUserPermissionsAndFilters()
    {
        var pagination = new PaginationQuery { Page = 1, PageSize = 25 };
        var response = PaginatedResponse<AppointmentDto>.Create([], 1, 25, 0);
        var from = DateTimeOffset.UtcNow.AddDays(-1);
        var to = DateTimeOffset.UtcNow.AddDays(1);
        _appointmentService
            .Setup(service => service.GetAppointmentsAsync(
                88,
                It.Is<IEnumerable<string>>(permissions => permissions.Contains("Appointments.Read")),
                null,
                from,
                to,
                "scheduled",
                pagination,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.GetAppointments(null, from, to, "scheduled", pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetById_WhenMissing_ReturnsNotFound()
    {
        _appointmentService
            .Setup(service => service.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AppointmentDto?)null);

        var result = await _controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_PassesCurrentUserAndReturnsCreatedAppointment()
    {
        var request = new CreateAppointmentDto { PatientProfileId = 3, DoctorProfileId = 4 };
        var appointment = new AppointmentDto { Id = 12, PatientProfileId = 3, DoctorProfileId = 4 };
        _appointmentService
            .Setup(service => service.CreateAsync(request, 88, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(appointment, ControllerTestHelper.AssertCreatedValue(result, nameof(AppointmentsController.GetById)));
    }

    [Fact]
    public async Task Export_ReturnsFileFromDataTransferService()
    {
        var export = new DataExportFileDto
        {
            Content = [1, 2, 3],
            ContentType = "text/csv",
            FileName = "appointments.csv"
        };
        _dataTransferService
            .Setup(service => service.ExportAsync(
                "appointments",
                "csv",
                It.IsAny<IReadOnlyDictionary<string, string?>>(),
                88,
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(export);

        var result = await _controller.Export("csv", "scheduled", CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
        Assert.Equal("appointments.csv", file.FileDownloadName);
        _dataTransferService.Verify(
            service => service.ExportAsync(
                "appointments",
                "csv",
                It.Is<IReadOnlyDictionary<string, string?>>(filters => filters["status"] == "scheduled"),
                88,
                It.Is<IReadOnlyCollection<string>>(permissions => permissions.Contains("Appointments.Read")),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Import_ReturnsImportResult()
    {
        var importResult = new DataImportResultDto { TotalRows = 2, Imported = 2 };
        _dataTransferService
            .Setup(service => service.ImportAsync(
                "appointments",
                "csv",
                "appointments.csv",
                It.IsAny<Stream>(),
                3,
                88,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(importResult);

        var file = new FormFile(new MemoryStream([1, 2, 3]), 0, 3, "file", "appointments.csv")
        {
            Headers = new HeaderDictionary()
        };
        var result = await _controller.Import("csv", file, CancellationToken.None);

        Assert.Same(importResult, ControllerTestHelper.AssertOkValue(result));
        _dataTransferService.Verify(
            service => service.ImportAsync(
                "appointments",
                "csv",
                "appointments.csv",
                It.IsAny<Stream>(),
                3,
                88,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
