using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class NurseTasksControllerTests
{
    private readonly Mock<INurseTaskService> _service = new();
    private readonly NurseTasksController _controller;

    public NurseTasksControllerTests()
    {
        _controller = new NurseTasksController(_service.Object);
        ControllerTestHelper.SetUser(_controller, userId: 58, roles: ["Nurse"], permissions: ["NurseTasks.Read"]);
    }

    [Fact]
    public async Task Create_PassesCurrentUserRolesAndReturnsTask()
    {
        var request = new CreateNurseTaskRequestDto { EncounterId = 4, Type = "Vitals" };
        var task = new NurseTaskDto { Id = 1, EncounterId = 4, Type = request.Type };
        _service
            .Setup(service => service.CreateAsync(
                request,
                58,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Nurse")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(task);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(task, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetMyTasks_ForwardsFiltersAndPagination()
    {
        var pagination = new PaginationQuery { Page = 2, PageSize = 25 };
        var response = PaginatedResponse<NurseTaskDto>.Create([new NurseTaskDto { Id = 2 }], 2, 25, 26);
        _service
            .Setup(service => service.GetMyTasksAsync(
                58,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Nurse")),
                "Open",
                "High",
                pagination,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.GetMyTasks("Open", "High", pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Update_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        _service
            .Setup(service => service.UpdateAsync(9, It.IsAny<UpdateNurseTaskRequestDto>(), 58, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Cannot update completed task."));

        var result = await _controller.Update(9, new UpdateNurseTaskRequestDto(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Complete_PassesCurrentUserAndReturnsTask()
    {
        var task = new NurseTaskDto { Id = 3, Status = "Completed" };
        _service
            .Setup(service => service.CompleteAsync(3, 58, It.IsAny<CancellationToken>()))
            .ReturnsAsync(task);

        var result = await _controller.Complete(3, CancellationToken.None);

        Assert.Same(task, ControllerTestHelper.AssertOkValue(result));
    }
}
