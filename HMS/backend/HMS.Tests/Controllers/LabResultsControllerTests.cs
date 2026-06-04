using HMS.Api.Controllers.Patient;
using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class LabResultsControllerTests
{
    [Fact]
    public async Task MyLabResults_List_PassesCurrentPatientUser()
    {
        var service = new Mock<ILabResultService>();
        var environment = new Mock<IWebHostEnvironment>();
        var controller = new MyLabResultsController(service.Object, environment.Object);
        var results = new List<LabResultDto> { new() { Id = 1 } };
        ControllerTestHelper.SetUser(controller, userId: 93, permissions: ["Own.LabResults.View"]);
        service
            .Setup(s => s.GetPublishedForPatientUserAsync(93, It.IsAny<CancellationToken>()))
            .ReturnsAsync(results);

        var result = await controller.List(CancellationToken.None);

        Assert.Same(results, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task MyLabResults_Download_WhenAttachmentMissing_ReturnsNotFound()
    {
        var service = new Mock<ILabResultService>();
        var environment = new Mock<IWebHostEnvironment>();
        var controller = new MyLabResultsController(service.Object, environment.Object);
        ControllerTestHelper.SetUser(controller, userId: 94, permissions: ["Own.LabResults.Download"]);
        service
            .Setup(s => s.GetPublishedAttachmentForPatientUserAsync(5, 94, It.IsAny<CancellationToken>()))
            .ReturnsAsync((LabResultAttachmentDto?)null);

        var result = await controller.DownloadPdf(5, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ReceptionLabResults_GetById_WhenMissing_ReturnsNotFound()
    {
        var service = new Mock<ILabResultService>();
        var environment = new Mock<IWebHostEnvironment>();
        var controller = new ReceptionLabResultsController(service.Object, environment.Object);
        service
            .Setup(s => s.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((LabResultDto?)null);

        var result = await controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task ReceptionLabResults_List_ForwardsPatientAndPagination()
    {
        var service = new Mock<ILabResultService>();
        var environment = new Mock<IWebHostEnvironment>();
        var controller = new ReceptionLabResultsController(service.Object, environment.Object);
        var pagination = new PaginationQuery { Page = 2, PageSize = 25 };
        var response = PaginatedResponse<LabResultDto>.Create([new LabResultDto { Id = 8 }], 2, 25, 26);
        service
            .Setup(s => s.GetLabResultsAsync(12, pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await controller.List(12, pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }
}
