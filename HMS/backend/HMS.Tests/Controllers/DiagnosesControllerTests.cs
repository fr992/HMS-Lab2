using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class DiagnosesControllerTests
{
    private readonly Mock<IDiagnosisService> _diagnosisService = new();
    private readonly DiagnosesController _controller;

    public DiagnosesControllerTests()
    {
        _controller = new DiagnosesController(_diagnosisService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 18, roles: ["Doctor"], permissions: ["Encounters.Read"]);
    }

    [Fact]
    public async Task GetAll_ReturnsDiagnosesForEncounter()
    {
        var diagnoses = new List<DiagnosisDto> { new() { Id = 1, EncounterId = 8 } };
        _diagnosisService
            .Setup(service => service.GetByEncounterAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(diagnoses);

        var result = await _controller.GetAll(8, CancellationToken.None);

        Assert.Same(diagnoses, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetAll_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        _diagnosisService
            .Setup(service => service.GetByEncounterAsync(8, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Encounter not found."));

        var result = await _controller.GetAll(8, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_PassesCurrentUserRolesAndReturnsCreatedDiagnosis()
    {
        var request = new CreateDiagnosisDto { Description = "Stable", Type = "Primary" };
        var diagnosis = new DiagnosisDto { Id = 2, EncounterId = 8, Description = request.Description };
        _diagnosisService
            .Setup(service => service.CreateAsync(
                8,
                request,
                18,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(diagnosis);

        var result = await _controller.Create(8, request, CancellationToken.None);

        Assert.Same(diagnosis, ControllerTestHelper.AssertCreatedValue(result, nameof(DiagnosesController.GetAll)));
    }
}
