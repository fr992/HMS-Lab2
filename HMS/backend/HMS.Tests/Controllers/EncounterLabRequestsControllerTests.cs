using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class EncounterLabRequestsControllerTests
{
    private readonly Mock<ILabRequestService> _labRequestService = new();
    private readonly EncounterLabRequestsController _controller;

    public EncounterLabRequestsControllerTests()
    {
        _controller = new EncounterLabRequestsController(_labRequestService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 31, roles: ["Doctor"], permissions: ["Encounters.Read", "LabRequests.Create"]);
    }

    [Fact]
    public async Task GetByEncounter_WhenServiceThrows_ReturnsBadRequest()
    {
        _labRequestService
            .Setup(service => service.GetByEncounterAsync(9, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Encounter is closed."));

        var result = await _controller.GetByEncounter(9, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateFromEncounter_PassesCurrentUserAndRoles()
    {
        var request = new CreateLabRequestDto
        {
            Items = [new CreateLabRequestItemDto { LabTestId = 1 }, new CreateLabRequestItemDto { LabTestId = 2 }]
        };
        var created = new LabRequestDto { Id = 4, EncounterId = 9 };
        _labRequestService
            .Setup(service => service.CreateAsync(
                9,
                request,
                31,
                It.Is<IReadOnlyCollection<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(created);

        var result = await _controller.CreateFromEncounter(9, request, CancellationToken.None);

        Assert.Same(created, ControllerTestHelper.AssertCreatedValue(result, nameof(EncounterLabRequestsController.GetById)));
    }

    [Fact]
    public async Task GetById_WhenEncounterDoesNotMatch_ReturnsNotFound()
    {
        _labRequestService
            .Setup(service => service.GetByIdAsync(4, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LabRequestDto { Id = 4, EncounterId = 99 });

        var result = await _controller.GetById(9, 4, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }
}
