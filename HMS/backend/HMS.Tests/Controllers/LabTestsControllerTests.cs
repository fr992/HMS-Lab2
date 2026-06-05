using HMS.Api.Controllers.Admin;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class LabTestsControllerTests
{
    private readonly Mock<ILabTestService> _labTestService = new();
    private readonly Mock<IDataTransferService> _dataTransferService = new();
    private readonly LabTestsController _controller;

    public LabTestsControllerTests()
    {
        _controller = new LabTestsController(_labTestService.Object, _dataTransferService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 17);
    }

    [Fact]
    public async Task List_ReturnsServiceResponse()
    {
        var pagination = new PaginationQuery { Page = 1, PageSize = 10 };
        var response = PaginatedResponse<LabTestDto>.Create([new LabTestDto { Id = 1, Name = "CBC" }], 1, 10, 1);
        _labTestService
            .Setup(service => service.GetLabTestsAsync(true, pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.List(true, pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Create_WhenDuplicateNameOrCode_PropagatesConflict()
    {
        _labTestService
            .Setup(service => service.CreateAsync(It.IsAny<CreateLabTestDto>(), 17, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ConflictException("A lab test with this name or code already exists."));

        await Assert.ThrowsAsync<ConflictException>(() =>
            _controller.Create(new CreateLabTestDto { Name = "CBC" }, CancellationToken.None));
    }

    [Fact]
    public async Task Update_WhenServiceRejectsRequest_PropagatesBadRequest()
    {
        _labTestService
            .Setup(service => service.UpdateAsync(5, It.IsAny<UpdateLabTestDto>(), 17, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new BadRequestException("Cannot update inactive test."));

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _controller.Update(5, new UpdateLabTestDto { Name = "CBC" }, CancellationToken.None));
    }

    [Fact]
    public async Task Delete_WhenSuccessful_ReturnsNoContent()
    {
        var result = await _controller.Delete(4, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _labTestService.Verify(service => service.DeleteAsync(4, 17, It.IsAny<CancellationToken>()), Times.Once);
    }
}
