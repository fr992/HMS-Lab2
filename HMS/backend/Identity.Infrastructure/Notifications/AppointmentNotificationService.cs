using System.Text;
using HMS.Application.Abstractions.Identity;
using Microsoft.Extensions.Logging;

namespace Identity.Infrastructure.Notifications;

public sealed class AppointmentNotificationService : IAppointmentNotificationService
{
    private readonly IEmailNotificationService _email;
    private readonly ILogger<AppointmentNotificationService> _logger;

    public AppointmentNotificationService(
        IEmailNotificationService email,
        ILogger<AppointmentNotificationService> logger)
    {
        _email = email;
        _logger = logger;
    }

    public async Task<bool> NotifyAsync(AppointmentNotification notification, CancellationToken cancellationToken)
    {
        var message = BuildMessage(notification);
        var subject = $"{notification.HospitalName}: appointment {notification.Status.ToLowerInvariant()}";

        return await TrySendAsync(
            "email",
            notification.AppointmentRequestId,
            () => _email.SendAsync(notification.Email, subject, message, cancellationToken));
    }

    private async Task<bool> TrySendAsync(string channel, int requestId, Func<Task> send)
    {
        try
        {
            await send();
            return true;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Failed to send {NotificationChannel} for online appointment request {AppointmentRequestId}.",
                channel,
                requestId);
            return false;
        }
    }

    private static string BuildMessage(AppointmentNotification notification)
    {
        var message = new StringBuilder()
            .Append(notification.HospitalName)
            .Append(": Hello ")
            .Append(notification.PatientName)
            .Append(", your appointment request status is ")
            .Append(notification.Status)
            .Append('.');

        if (notification.ScheduledStart.HasValue)
            message.Append(" Appointment date/time: ").Append(notification.ScheduledStart.Value.ToString("f")).Append('.');
        if (!string.IsNullOrWhiteSpace(notification.DoctorName))
            message.Append(" Doctor: ").Append(notification.DoctorName).Append('.');
        if (!string.IsNullOrWhiteSpace(notification.DepartmentName))
            message.Append(" Department: ").Append(notification.DepartmentName).Append('.');
        if (!string.IsNullOrWhiteSpace(notification.Reason))
            message.Append(" Reason: ").Append(notification.Reason).Append('.');

        return message.ToString();
    }
}
