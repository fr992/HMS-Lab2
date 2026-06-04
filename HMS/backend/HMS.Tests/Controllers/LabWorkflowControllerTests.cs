using HMS.Api.Controllers.Lab;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class LabWorkflowControllerTests
{
    [Fact]
    public async Task LabRequests_List_ForwardsStatusAndPagination()
    {
        var service = new Mock<ILabRequestService>();
        var controller = new LabRequestsWorkflowController(service.Object);
        var pagination = new PaginationQuery { Page = 1, PageSize = 25 };
        var response = PaginatedResponse<LabRequestDto>.Create([new LabRequestDto { Id = 1 }], 1, 25, 1);
        service
            .Setup(s => s.GetLabRequestsAsync("Pending", pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await controller.List("Pending", pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task LabRequests_UpdateStatus_PassesCurrentUser()
    {
        var service = new Mock<ILabRequestService>();
        var controller = new LabRequestsWorkflowController(service.Object);
        var request = new UpdateLabRequestStatusDto { Status = "Completed" };
        var dto = new LabRequestDto { Id = 2, Status = request.Status };
        ControllerTestHelper.SetUser(controller, userId: 74, permissions: ["LabRequests.UpdateStatus"]);
        service
            .Setup(s => s.UpdateStatusAsync(2, request, 74, It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto);

        var result = await controller.UpdateStatus(2, request, CancellationToken.None);

        Assert.Same(dto, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task LabResults_CreateWithoutAttachment_PassesMappedRequestAndCurrentUser()
    {
        var service = new Mock<ILabResultService>();
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(e => e.ContentRootPath).Returns(Path.GetTempPath());
        var controller = new LabResultsWorkflowController(service.Object, environment.Object);
        var dto = new LabResultDto { Id = 3, LabRequestItemId = 8 };
        ControllerTestHelper.SetUser(controller, userId: 75, permissions: ["LabResults.Create"]);
        service
            .Setup(s => s.CreateAsync(
                It.Is<CreateLabResultDto>(request =>
                    request.LabRequestItemId == 8 &&
                    request.ResultData == "Negative" &&
                    request.FileStoredName == null),
                75,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto);

        var result = await controller.Create(
            new LabResultFormRequest { LabRequestItemId = 8, ResultData = "Negative" },
            CancellationToken.None);

        Assert.Same(dto, ControllerTestHelper.AssertCreatedValue(result, "GetById"));
    }

    [Fact]
    public async Task LabResults_Publish_PassesCurrentUser()
    {
        var service = new Mock<ILabResultService>();
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(e => e.ContentRootPath).Returns(Path.GetTempPath());
        var controller = new LabResultsWorkflowController(service.Object, environment.Object);
        var dto = new LabResultDto { Id = 4, VerifiedAt = DateTime.UtcNow };
        ControllerTestHelper.SetUser(controller, userId: 76, permissions: ["LabResults.Publish"]);
        service
            .Setup(s => s.PublishAsync(4, 76, It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto);

        var result = await controller.Publish(4, CancellationToken.None);

        Assert.Same(dto, ControllerTestHelper.AssertOkValue(result));
    }
}
