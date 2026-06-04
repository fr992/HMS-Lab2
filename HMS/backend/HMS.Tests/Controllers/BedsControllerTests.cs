using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class BedsControllerTests
{
    private readonly Mock<IBedService> _bedService = new();
    private readonly Mock<IDataTransferService> _dataTransferService = new();
    private readonly BedsController _controller;

    public BedsControllerTests()
    {
        _controller = new BedsController(_bedService.Object, _dataTransferService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 88, permissions: ["Beds.Read", "Beds.Assign"]);
    }

    [Fact]
    public async Task GetBeds_PassesPagedQueryToService()
    {
        var query = new BedListQueryDto
        {
            Page = 2,
            PageSize = 40,
            Search = "cardio",
            Status = "Available",
            DepartmentId = 7,
            RoomNumber = "201",
            AssignmentStatus = "unassigned"
        };
        var response = PaginatedResponse<BedDto>.Create(
            [new BedDto { Id = 11, BedNumber = "B1", Status = "Available" }],
            2,
            40,
            41);

        _bedService
            .Setup(service => service.GetBedsAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.GetBeds(query, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetDepartmentBeds_PassesCurrentUserAndPaginationToService()
    {
        var pagination = new PaginationQuery { Page = 1, PageSize = 40, Search = "ward" };
        var response = PaginatedResponse<BedPatientDetailsDto>.Create(
            [new BedPatientDetailsDto { BedId = 3, BedLabel = "B3", Status = "Occupied" }],
            1,
            40,
            1);

        _bedService
            .Setup(service => service.GetBedsWithOccupancyByDepartmentAsync(
                88,
                pagination,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.GetDepartmentBeds(pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Assign_WhenCurrentUserIsDoctor_ThrowsForbiddenBeforeServiceCall()
    {
        ControllerTestHelper.SetUser(_controller, userId: 88, roles: ["Doctor"]);

        await Assert.ThrowsAsync<HMS.Application.Exceptions.ForbiddenException>(() =>
            _controller.Assign(4, new AssignBedDto { PatientProfileId = 12 }, CancellationToken.None));

        _bedService.Verify(
            service => service.AssignAsync(
                It.IsAny<int>(),
                It.IsAny<AssignBedDto>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Export_PassesFiltersPermissionsAndCurrentUserToDataTransferService()
    {
        var exported = new DataExportFileDto
        {
            FileName = "beds.csv",
            ContentType = "text/csv",
            Content = [1, 2, 3]
        };

        _dataTransferService
            .Setup(service => service.ExportAsync(
                "beds",
                "csv",
                It.Is<IReadOnlyDictionary<string, string?>>(filters =>
                    filters["status"] == "Available" && filters["departmentId"] == "9"),
                88,
                It.Is<IReadOnlyCollection<string>>(permissions => permissions.Contains("Beds.Read")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(exported);

        var result = await _controller.Export("csv", "Available", 9, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal(exported.Content, file.FileContents);
        Assert.Equal(exported.ContentType, file.ContentType);
        Assert.Equal(exported.FileName, file.FileDownloadName);
    }
}
