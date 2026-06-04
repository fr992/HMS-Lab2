using HMS.Api.Controllers.Admin;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class MedicationsControllerTests
{
    private readonly Mock<IMedicationsService> _medicationsService = new();
    private readonly Mock<IDataTransferService> _dataTransferService = new();
    private readonly MedicationsController _controller;

    public MedicationsControllerTests()
    {
        _controller = new MedicationsController(_medicationsService.Object, _dataTransferService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 99, permissions: ["Medications.Read"]);
    }

    [Fact]
    public async Task Create_PassesCurrentUserToServiceAndReturnsCreated()
    {
        var request = new CreateMedicationDto { Name = "Ibuprofen" };
        var medication = new MedicationDto { Id = 11, Name = request.Name, IsActive = true };
        _medicationsService
            .Setup(service => service.CreateAsync(request, 99, It.IsAny<CancellationToken>()))
            .ReturnsAsync(medication);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(medication, ControllerTestHelper.AssertCreatedValue(result, nameof(MedicationsController.GetById)));
    }

    [Fact]
    public async Task GetById_WhenMedicationMissing_ReturnsNotFound()
    {
        _medicationsService
            .Setup(service => service.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicationDto?)null);

        var result = await _controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Export_PassesModuleFiltersAndPermissionsToDataTransferService()
    {
        var exported = new DataExportFileDto
        {
            FileName = "medications.csv",
            ContentType = "text/csv",
            Content = [1, 2, 3]
        };

        _dataTransferService
            .Setup(service => service.ExportAsync(
                "medications",
                "csv",
                It.Is<IReadOnlyDictionary<string, string?>>(filters =>
                    filters["isActive"] == "True" && filters["search"] == "ibu"),
                99,
                It.Is<IReadOnlyCollection<string>>(permissions => permissions.Contains("Medications.Read")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(exported);

        var result = await _controller.Export("csv", true, "ibu", CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal(exported.Content, file.FileContents);
        Assert.Equal(exported.ContentType, file.ContentType);
        Assert.Equal(exported.FileName, file.FileDownloadName);
    }

    [Fact]
    public async Task Import_StreamsUploadedFileToDataTransferService()
    {
        var importResult = new DataImportResultDto { TotalRows = 1, Imported = 1 };
        var file = new FormFile(new MemoryStream([1, 2, 3, 4]), 0, 4, "file", "medications.csv");
        _dataTransferService
            .Setup(service => service.ImportAsync(
                "medications",
                "csv",
                "medications.csv",
                It.IsAny<Stream>(),
                4,
                99,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(importResult);

        var result = await _controller.Import("csv", file, CancellationToken.None);

        Assert.Same(importResult, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Delete_PassesCurrentUserAndReturnsNoContent()
    {
        var result = await _controller.Delete(3, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _medicationsService.Verify(service => service.DeleteAsync(3, 99, It.IsAny<CancellationToken>()), Times.Once);
    }
}
