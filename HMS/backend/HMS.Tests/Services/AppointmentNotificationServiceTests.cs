using HMS.Application.Abstractions.Identity;
using Identity.Infrastructure.Notifications;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace HMS.Tests.Services;

public sealed class AppointmentNotificationServiceTests
{
    [Fact]
    public async Task NotifyAsync_Confirmed_SendsProfessionalHtmlEmail()
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
            "Nexora Hospital - Appointment Confirmed",
            It.Is<string>(message =>
                message.Contains("<!doctype html>")
                && message.Contains("background-color:#dcfce7")
                && message.Contains("Confirmed")
                && message.Contains("Dr. Test")
                && message.Contains("Cardiology")
                && message.Contains("Please arrive 10 minutes before your appointment.")
                && message.Contains("contact@nexora.test")
                && message.Contains("+1 555 0100")),
            true,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task NotifyAsync_Rejected_UsesDefaultReasonAndOmitsMissingOptionalRows()
    {
        var email = new Mock<IEmailNotificationService>();
        var service = new AppointmentNotificationService(
            email.Object,
            NullLogger<AppointmentNotificationService>.Instance);
        var notification = CreateNotification() with
        {
            Status = "Rejected",
            ScheduledStart = null,
            DoctorName = null,
            DepartmentName = null,
            Reason = null
        };

        var sent = await service.NotifyAsync(notification, CancellationToken.None);

        Assert.True(sent);
        email.Verify(x => x.SendAsync(
            notification.Email,
            "Nexora Hospital - Appointment Request Rejected",
            It.Is<string>(message =>
                message.Contains("background-color:#fde8e8")
                && message.Contains("We were unable to accommodate this appointment request at this time.")
                && !message.Contains(">Doctor<")
                && !message.Contains(">Department<")
                && !message.Contains(">Date &amp; Time<")),
            true,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task NotifyAsync_Rescheduled_UsesNewAppointmentDetailsAndEncodesValues()
    {
        var email = new Mock<IEmailNotificationService>();
        var service = new AppointmentNotificationService(
            email.Object,
            NullLogger<AppointmentNotificationService>.Instance);
        var notification = CreateNotification() with
        {
            Status = "Rescheduled",
            PatientName = "Patient <Test>",
            ScheduledStart = new DateTime(2026, 7, 2, 14, 0, 0)
        };

        var sent = await service.NotifyAsync(notification, CancellationToken.None);

        Assert.True(sent);
        email.Verify(x => x.SendAsync(
            notification.Email,
            "Nexora Hospital - Appointment Rescheduled",
            It.Is<string>(message =>
                message.Contains("background-color:#e0f2fe")
                && message.Contains("Patient &lt;Test&gt;")
                && message.Contains("Thursday, July 2, 2026 at 2:00 PM")
                && message.Contains("Please review the new time and contact us if it does not work for you.")),
            true,
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
                It.IsAny<bool>(),
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
            null,
            "contact@nexora.test",
            "+1 555 0100");
}
