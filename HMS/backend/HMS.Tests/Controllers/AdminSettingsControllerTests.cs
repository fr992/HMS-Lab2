using HMS.Api.Controllers.Admin;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class AdminSettingsControllerTests
{
    private readonly Mock<ISettingsService> _settingsService = new();
    private readonly AdminSettingsController _controller;

    public AdminSettingsControllerTests()
    {
        _controller = new AdminSettingsController(_settingsService.Object);
    }

    [Fact]
    public async Task GetSettings_ReturnsPaginatedSettings()
    {
        var pagination = new PaginationQuery { Page = 2, PageSize = 5 };
        var response = PaginatedResponse<SettingDto>.Create([new SettingDto { Id = 7, Key = "Theme" }], 2, 5, 6);
        _settingsService
            .Setup(service => service.GetAllAsync(pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.GetSettings(pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetById_WhenSettingDoesNotExist_ReturnsNotFound()
    {
        _settingsService
            .Setup(service => service.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SettingDto?)null);

        var result = await _controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtGetById()
    {
        var request = new CreateSettingDto { Key = "Maintenance", Value = "false" };
        var created = new SettingDto { Id = 12, Key = request.Key, Value = request.Value };
        _settingsService
            .Setup(service => service.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(created);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(created, ControllerTestHelper.AssertCreatedValue(result, nameof(AdminSettingsController.GetById)));
    }

    [Fact]
    public async Task Delete_DeletesSettingAndReturnsNoContent()
    {
        var result = await _controller.Delete(5, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _settingsService.Verify(service => service.DeleteAsync(5, It.IsAny<CancellationToken>()), Times.Once);
    }
}
