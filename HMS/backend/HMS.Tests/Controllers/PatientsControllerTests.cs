using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class PatientsControllerTests
{
    private readonly Mock<IPatientService> _patientService = new();
    private readonly Mock<IDataTransferService> _dataTransferService = new();
    private readonly PatientsController _controller;

    public PatientsControllerTests()
    {
        _controller = new PatientsController(_patientService.Object, _dataTransferService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 31, permissions: ["Patients.Read"], roles: ["Receptionist"]);
    }

    [Fact]
    public async Task RegisterPatient_ReturnsCreatedPatient()
    {
        var request = new RegisterPatientRequestDto { FirstName = "Ana", LastName = "Kowalska" };
        var patient = new PatientProfileDto { Id = 22, FirstName = "Ana", LastName = "Kowalska" };
        _patientService
            .Setup(service => service.RegisterAsync(request, 31, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patient);

        var result = await _controller.RegisterPatient(request, CancellationToken.None);

        Assert.Same(patient, ControllerTestHelper.AssertCreatedValue(result, nameof(PatientsController.GetById)));
    }

    [Fact]
    public async Task GetAll_WhenUserIsDoctorOnly_ReturnsForbid()
    {
        ControllerTestHelper.SetUser(_controller, userId: 7, roles: ["Doctor"]);

        var result = await _controller.GetAll(new PaginationQuery(), null, null, CancellationToken.None);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ForDoctorOnly_UsesDoctorScopedLookupWithRoles()
    {
        ControllerTestHelper.SetUser(_controller, userId: 7, roles: ["Doctor"]);
        var patient = new PatientProfileDto { Id = 10, FirstName = "Scoped" };
        _patientService
            .Setup(service => service.GetByIdForCurrentDoctorAsync(
                7,
                10,
                It.Is<IEnumerable<string>>(roles => roles.Contains("Doctor")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(patient);

        var result = await _controller.GetById(10, CancellationToken.None);

        Assert.Same(patient, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task DeletePatient_WhenServiceReturnsFalse_ReturnsNotFound()
    {
        _patientService
            .Setup(service => service.DeleteAsync(12, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _controller.DeletePatient(12, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }
}
