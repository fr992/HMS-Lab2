using HMS.Api.Controllers;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class MyNotificationsControllerTests
{
    private readonly Mock<INotificationService> _notificationService = new();
    private readonly MyNotificationsController _controller;

    public MyNotificationsControllerTests()
    {
        _controller = new MyNotificationsController(_notificationService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 63);
    }

    [Fact]
    public async Task List_ReturnsCurrentUsersNotifications()
    {
        var pagination = new PaginationQuery { Page = 1, PageSize = 10 };
        var response = PaginatedResponse<NotificationDto>.Create([new NotificationDto { Id = "n1", UserId = 63 }], 1, 10, 1);
        _notificationService
            .Setup(service => service.GetForUserAsync(63, false, pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.List(false, pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetUnreadCount_ReturnsCountDto()
    {
        _notificationService
            .Setup(service => service.GetUnreadCountAsync(63, It.IsAny<CancellationToken>()))
            .ReturnsAsync(8);

        var result = await _controller.GetUnreadCount(CancellationToken.None);

        var dto = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(8, dto.Count);
    }

    [Fact]
    public async Task MarkAsRead_PassesNotificationIdAndCurrentUser()
    {
        var result = await _controller.MarkAsRead("notification-id", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _notificationService.Verify(
            service => service.MarkAsReadAsync("notification-id", 63, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ClearAll_PassesCurrentUser()
    {
        var result = await _controller.ClearAll(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _notificationService.Verify(service => service.ClearAllAsync(63, It.IsAny<CancellationToken>()), Times.Once);
    }
}
