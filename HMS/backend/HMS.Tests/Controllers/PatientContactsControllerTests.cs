using HMS.Api.Controllers.Patient;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class PatientContactsControllerTests
{
    private readonly Mock<IPatientContactService> _contacts = new();
    private readonly PatientContactsController _controller;

    public PatientContactsControllerTests()
    {
        _controller = new PatientContactsController(_contacts.Object);
    }

    [Fact]
    public async Task GetByPatientId_WhenMissing_ReturnsNotFound()
    {
        _contacts
            .Setup(service => service.GetByPatientIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<PatientContactDto>?)null);

        var result = await _controller.GetByPatientId(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetByPatientId_ReturnsContacts()
    {
        var contacts = new List<PatientContactDto> { new() { Name = "Ana", Phone = "123" } };
        _contacts
            .Setup(service => service.GetByPatientIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(contacts);

        var result = await _controller.GetByPatientId(7, CancellationToken.None);

        Assert.Same(contacts, HMS.Tests.TestSupport.ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Update_WhenContactsNull_ReturnsBadRequest()
    {
        var result = await _controller.Update(7, null!, CancellationToken.None);

        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Update_WhenPatientMissing_ReturnsNotFound()
    {
        _contacts
            .Setup(service => service.UpdateContactsAsync(7, It.IsAny<IReadOnlyList<PatientContactDto>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Patient not found."));

        var result = await _controller.Update(7, [], CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_WhenSuccessful_ReturnsNoContent()
    {
        var contacts = new List<PatientContactDto> { new() { Name = "Ana", Phone = "123" } };

        var result = await _controller.Update(7, contacts, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _contacts.Verify(service => service.UpdateContactsAsync(7, contacts, It.IsAny<CancellationToken>()), Times.Once);
    }
}
