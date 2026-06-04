using HMS.Api.Controllers.Clinical;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class PrescriptionsControllerTests
{
    private readonly Mock<IPrescriptionService> _prescriptionService = new();
    private readonly PrescriptionsController _controller;

    public PrescriptionsControllerTests()
    {
        _controller = new PrescriptionsController(_prescriptionService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 38, permissions: ["Prescriptions.Read"]);
    }

    [Fact]
    public async Task Create_SetsEncounterIdAndReturnsCreatedPrescription()
    {
        var request = new CreatePrescriptionDto { Notes = "Take after meals" };
        var prescription = new PrescriptionDto { Id = 5, EncounterId = 12, Notes = request.Notes };
        _prescriptionService
            .Setup(service => service.CreateAsync(
                It.Is<CreatePrescriptionDto>(dto => ReferenceEquals(dto, request) && dto.EncounterId == 12),
                38,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(prescription);

        var result = await _controller.Create(12, request, CancellationToken.None);

        Assert.Same(prescription, ControllerTestHelper.AssertCreatedValue(result, nameof(PrescriptionsController.GetById)));
    }

    [Fact]
    public async Task GetByEncounter_ReturnsPrescriptionsForEncounter()
    {
        var prescriptions = new List<PrescriptionDto> { new() { Id = 6, EncounterId = 12 } };
        _prescriptionService
            .Setup(service => service.GetPrescriptionsAsync(12, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(prescriptions);

        var result = await _controller.GetByEncounter(12, CancellationToken.None);

        Assert.Same(prescriptions, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetById_WhenPrescriptionBelongsToDifferentEncounter_ReturnsNotFound()
    {
        _prescriptionService
            .Setup(service => service.GetByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PrescriptionDto { Id = 7, EncounterId = 99 });

        var result = await _controller.GetById(12, 7, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_WhenPrescriptionMatchesEncounter_ReturnsUpdatedPrescription()
    {
        var request = new UpdatePrescriptionStatusDto { Status = "Dispensed" };
        var updated = new PrescriptionDto { Id = 8, EncounterId = 12, Status = request.Status };
        _prescriptionService
            .Setup(service => service.GetByIdAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PrescriptionDto { Id = 8, EncounterId = 12 });
        _prescriptionService
            .Setup(service => service.UpdateStatusAsync(8, request, 38, It.IsAny<CancellationToken>()))
            .ReturnsAsync(updated);

        var result = await _controller.UpdateStatus(12, 8, request, CancellationToken.None);

        Assert.Same(updated, ControllerTestHelper.AssertOkValue(result));
    }
}
