using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class EncountersControllerTests
{
    private readonly Mock<IEncounterService> _encounterService = new();
    private readonly EncountersController _controller;

    public EncountersControllerTests()
    {
        _controller = new EncountersController(_encounterService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 28, roles: ["Doctor"], permissions: ["Encounters.Read"]);
    }

    [Fact]
    public async Task Create_PassesCurrentUserAndReturnsCreatedEncounter()
    {
        var request = new CreateEncounterDto { PatientProfileId = 3, DoctorProfileId = 4 };
        var encounter = new EncounterDto { Id = 9, PatientProfileId = request.PatientProfileId };
        _encounterService
            .Setup(service => service.CreateAsync(request, 28, It.IsAny<CancellationToken>()))
            .ReturnsAsync(encounter);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(encounter, ControllerTestHelper.AssertCreatedValue(result, nameof(EncountersController.GetById)));
    }

    [Fact]
    public async Task GetById_WhenMissing_ReturnsNotFound()
    {
        _encounterService
            .Setup(service => service.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((EncounterDto?)null);

        var result = await _controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetAll_PassesCurrentUserRolesAndFilters()
    {
        var encounters = new List<EncounterDto> { new() { Id = 1, PatientProfileId = 5 } };
        _encounterService
            .Setup(service => service.GetEncountersAsync(
                5,
                6,
                "fever",
                28,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(encounters);

        var result = await _controller.GetAll(5, 6, "fever", new PaginationQuery(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(encounters, Assert.IsAssignableFrom<List<EncounterDto>>(ok.Value));
    }

    [Fact]
    public async Task GetAll_WhenUnauthorized_ReturnsForbid()
    {
        _encounterService
            .Setup(service => service.GetEncountersAsync(
                null,
                null,
                null,
                28,
                It.IsAny<IEnumerable<string>>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        var result = await _controller.GetAll(null, null, null, new PaginationQuery(), CancellationToken.None);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Close_SetsCompletedStatus()
    {
        var encounter = new EncounterDto { Id = 7, Status = EncounterStatus.Completed };
        _encounterService
            .Setup(service => service.UpdateStatusAsync(
                7,
                It.Is<UpdateEncounterStatusDto>(request => request.Status == EncounterStatus.Completed),
                28,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(encounter);

        var result = await _controller.Close(7, CancellationToken.None);

        Assert.Same(encounter, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetPanel_WhenMissing_ReturnsNotFound()
    {
        _encounterService
            .Setup(service => service.GetPanelAsync(4, 28, It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((EncounterPanelDto?)null);

        var result = await _controller.GetPanel(4, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetPatientEncounters_PassesCurrentUser()
    {
        var encounters = new List<EncounterDto> { new() { Id = 12 } };
        _encounterService
            .Setup(service => service.GetPatientEncountersAsync(28, It.IsAny<CancellationToken>()))
            .ReturnsAsync(encounters);

        var result = await _controller.GetPatientEncounters(new PaginationQuery(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(encounters, Assert.IsAssignableFrom<List<EncounterDto>>(ok.Value));
    }
}
