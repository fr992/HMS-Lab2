using System.Text;
using HMS.Api.Controllers;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class DataTransferControllerTests
{
    [Fact]
    public async Task Export_WhenUserHasReadPermission_ReturnsFile()
    {
        var service = new Mock<IDataTransferService>();
        var controller = new DataTransferController(service.Object);
        ControllerTestHelper.SetUser(controller, userId: 90, permissions: ["Patients.Read"]);
        controller.Request.QueryString = new QueryString("?status=active");
        service
            .Setup(s => s.ExportAsync(
                "patients",
                "csv",
                It.Is<IReadOnlyDictionary<string, string?>>(filters => filters["status"] == "active"),
                90,
                It.Is<IReadOnlyCollection<string>>(permissions => permissions.Contains("Patients.Read")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DataExportFileDto
            {
                Content = Encoding.UTF8.GetBytes("ok"),
                ContentType = "text/csv",
                FileName = "patients.csv"
            });

        var result = await controller.Export("patients", "csv", CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("patients.csv", file.FileDownloadName);
        Assert.Equal("text/csv", file.ContentType);
    }

    [Fact]
    public async Task Export_WhenPermissionMissing_ReturnsForbid()
    {
        var controller = new DataTransferController(Mock.Of<IDataTransferService>());
        ControllerTestHelper.SetUser(controller, userId: 90);

        var result = await controller.Export("patients", "csv", CancellationToken.None);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Import_WhenModuleIsExportOnly_ThrowsBadRequest()
    {
        var controller = new DataTransferController(Mock.Of<IDataTransferService>());
        ControllerTestHelper.SetUser(controller, userId: 90, permissions: ["Invoices.Read"]);
        var file = new FormFile(new MemoryStream(Encoding.UTF8.GetBytes("x")), 0, 1, "file", "invoices.csv");

        await Assert.ThrowsAsync<BadRequestException>(() =>
            controller.Import("invoices", "csv", file, CancellationToken.None));
    }

    [Fact]
    public async Task Import_WhenUserHasPermission_ReturnsImportResult()
    {
        var service = new Mock<IDataTransferService>();
        var controller = new DataTransferController(service.Object);
        ControllerTestHelper.SetUser(controller, userId: 91, permissions: ["Patients.Register"]);
        var file = new FormFile(new MemoryStream(Encoding.UTF8.GetBytes("name\nAna")), 0, 8, "file", "patients.csv");
        var importResult = new DataImportResultDto { TotalRows = 1, Imported = 1 };
        service
            .Setup(s => s.ImportAsync(
                "patients",
                "csv",
                "patients.csv",
                It.IsAny<Stream>(),
                8,
                91,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(importResult);

        var result = await controller.Import("patients", "csv", file, CancellationToken.None);

        Assert.Same(importResult, ControllerTestHelper.AssertOkValue(result));
    }
}
