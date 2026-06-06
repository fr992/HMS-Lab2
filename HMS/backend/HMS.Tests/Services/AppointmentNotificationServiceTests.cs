using HMS.Application.Abstractions.Identity;
using Identity.Infrastructure.Notifications;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace HMS.Tests.Services;

public sealed class AppointmentNotificationServiceTests
{
    [Fact]
    public async Task NotifyAsync_SendsEmailWithAppointmentDetails()
    {
        var email = new Mock<IEmailNotificationService>();
        var service = new AppointmentNotificationService(
            email.Object,
            NullLogger<AppointmentNotificationService>.Instance);
        var notification = CreateNotification();

        var sent = await service.NotifyAsync(notification, CancellationToken.None);

        Assert.True(sent);
        email.Verify(x => x.SendAsync(
            notification.Email,
            It.Is<string>(subject => subject.Contains(notification.HospitalName)),
            It.Is<string>(message =>
                message.Contains("Confirmed")
                && message.Contains("Dr. Test")
                && message.Contains("Cardiology")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task NotifyAsync_WhenEmailFails_ReturnsFalseAndDoesNotThrow()
    {
        var email = new Mock<IEmailNotificationService>();
        email.Setup(x => x.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("provider failure"));
        var service = new AppointmentNotificationService(
            email.Object,
            NullLogger<AppointmentNotificationService>.Instance);

        var sent = await service.NotifyAsync(CreateNotification(), CancellationToken.None);

        Assert.False(sent);
    }

    private static AppointmentNotification CreateNotification() =>
        new(
            42,
            "Patient Test",
            "patient@example.test",
            "Nexora Hospital",
            "Confirmed",
            new DateTime(2026, 7, 1, 10, 30, 0),
            "Dr. Test",
            "Cardiology",
            null);
}
