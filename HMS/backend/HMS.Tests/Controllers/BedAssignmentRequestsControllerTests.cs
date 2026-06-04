using HMS.Api.Controllers.Clinical;
using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class BedAssignmentRequestsControllerTests
{
    [Fact]
    public async Task Reception_GetRequests_ForwardsStatusAndPagination()
    {
        var service = new Mock<IBedAssignmentRequestService>();
        var controller = new BedAssignmentRequestsController(service.Object);
        var pagination = new PaginationQuery { Page = 1, PageSize = 25 };
        var response = PaginatedResponse<BedAssignmentRequestDto>.Create([new BedAssignmentRequestDto { Id = 1 }], 1, 25, 1);
        service
            .Setup(s => s.GetRequestsAsync("Pending", pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await controller.GetRequests("Pending", pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Reception_Assign_PassesCurrentUser()
    {
        var service = new Mock<IBedAssignmentRequestService>();
        var controller = new BedAssignmentRequestsController(service.Object);
        var request = new AssignBedAssignmentRequestDto { BedId = 4 };
        var dto = new BedAssignmentRequestDto { Id = 2, AssignedBedLabel = "A-101-1" };
        ControllerTestHelper.SetUser(controller, userId: 66, permissions: ["BedAssignmentRequests.Assign"]);
        service
            .Setup(s => s.AssignAsync(2, request, 66, It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto);

        var result = await controller.Assign(2, request, CancellationToken.None);

        Assert.Same(dto, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Reception_Reject_PassesCurrentUser()
    {
        var service = new Mock<IBedAssignmentRequestService>();
        var controller = new BedAssignmentRequestsController(service.Object);
        var request = new RejectBedAssignmentRequestDto { Reason = "No beds" };
        var dto = new BedAssignmentRequestDto { Id = 3, Status = "Rejected" };
        ControllerTestHelper.SetUser(controller, userId: 67, permissions: ["BedAssignmentRequests.Reject"]);
        service
            .Setup(s => s.RejectAsync(3, request, 67, It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto);

        var result = await controller.Reject(3, request, CancellationToken.None);

        Assert.Same(dto, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Encounter_Create_PassesCurrentUserRolesAndEncounter()
    {
        var service = new Mock<IBedAssignmentRequestService>();
        var controller = new EncounterBedAssignmentRequestsController(service.Object);
        var request = new CreateBedAssignmentRequestDto { Priority = "urgent", Notes = "Admission" };
        var dto = new BedAssignmentRequestDto { Id = 4, EncounterId = 9 };
        ControllerTestHelper.SetUser(controller, userId: 68, roles: ["Doctor"]);
        service
            .Setup(s => s.CreateForEncounterAsync(
                9,
                request,
                68,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(dto);

        var result = await controller.Create(9, request, CancellationToken.None);

        Assert.Same(dto, ControllerTestHelper.AssertOkValue(result));
    }
}
