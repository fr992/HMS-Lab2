using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class DoctorPatientsControllerTests
{
    private readonly Mock<IPatientService> _patientService = new();
    private readonly DoctorPatientsController _controller;

    public DoctorPatientsControllerTests()
    {
        _controller = new DoctorPatientsController(_patientService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 52, roles: ["Doctor"], permissions: ["Patients.Read"]);
    }

    [Fact]
    public async Task GetDoctorPatients_PassesCurrentUserAndRoles()
    {
        var patients = new List<PatientProfileDto> { new() { Id = 1, PatientNumber = "P-001" } };
        _patientService
            .Setup(service => service.GetForCurrentDoctorAsync(
                52,
                It.Is<IReadOnlyCollection<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(patients);

        var result = await _controller.GetDoctorPatients(CancellationToken.None);

        Assert.Same(patients, ControllerTestHelper.AssertOkValue(result));
        _patientService.Verify(
            service => service.GetForCurrentDoctorAsync(
                52,
                It.Is<IReadOnlyCollection<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetDoctorPatients_WhenServiceRejectsRequest_ReturnsBadRequest()
    {
        _patientService
            .Setup(service => service.GetForCurrentDoctorAsync(52, It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Doctor profile not found."));

        var result = await _controller.GetDoctorPatients(CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
