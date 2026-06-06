using System.Net;
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
        var message = BuildHtmlMessage(notification);
        var subject = BuildSubject(notification);

        return await TrySendAsync(
            "email",
            notification.AppointmentRequestId,
            () => _email.SendAsync(notification.Email, subject, message, true, cancellationToken));
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

    private static string BuildSubject(AppointmentNotification notification)
    {
        var hospitalName = Clean(notification.HospitalName, "Nexora Hospital");
        return StatusKey(notification.Status) switch
        {
            "rejected" => $"{hospitalName} - Appointment Request Rejected",
            "rescheduled" => $"{hospitalName} - Appointment Rescheduled",
            _ => $"{hospitalName} - Appointment Confirmed"
        };
    }

    private static string BuildHtmlMessage(AppointmentNotification notification)
    {
        var status = StatusKey(notification.Status);
        var content = StatusContent(status, notification.Reason);
        var hospitalName = Encode(Clean(notification.HospitalName, "Nexora Hospital"));
        var patientName = Encode(Clean(notification.PatientName, "Patient"));
        var rows = new StringBuilder()
            .Append(DetailRow("Patient", patientName))
            .Append(DetailRow("Status", Encode(content.Label)));

        if (notification.ScheduledStart.HasValue)
            rows.Append(DetailRow("Date &amp; Time", Encode(notification.ScheduledStart.Value.ToString("dddd, MMMM d, yyyy 'at' h:mm tt"))));
        if (!string.IsNullOrWhiteSpace(notification.DoctorName))
            rows.Append(DetailRow("Doctor", Encode(notification.DoctorName.Trim())));
        if (!string.IsNullOrWhiteSpace(notification.DepartmentName))
            rows.Append(DetailRow("Department", Encode(notification.DepartmentName.Trim())));
        if (status == "rejected")
            rows.Append(DetailRow("Reason", Encode(Clean(notification.Reason, "We were unable to accommodate this appointment request at this time."))));

        var contactItems = new List<string>();
        if (!string.IsNullOrWhiteSpace(notification.HospitalEmail))
            contactItems.Add($"Email: {Encode(notification.HospitalEmail.Trim())}");
        if (!string.IsNullOrWhiteSpace(notification.HospitalPhone))
            contactItems.Add($"Phone: {Encode(notification.HospitalPhone.Trim())}");

        var contact = contactItems.Count > 0
            ? $"<p style=\"margin:8px 0 0;color:#64748b;font-size:13px;line-height:20px;\">Contact us: {string.Join(" &nbsp;|&nbsp; ", contactItems)}</p>"
            : string.Empty;

        return $"""
            <!doctype html>
            <html lang="en">
            <body style="margin:0;padding:0;background-color:#f4f8fb;font-family:Arial,Helvetica,sans-serif;color:#16324f;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f8fb;padding:24px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,51,76,0.08);">
                      <tr>
                        <td style="background-color:#087f8c;padding:24px 30px;color:#ffffff;">
                          <div style="font-size:22px;font-weight:700;line-height:28px;">{hospitalName}</div>
                          <div style="margin-top:4px;font-size:13px;line-height:20px;color:#d9f4f1;">Patient Appointment Services</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px;">
                          <span style="display:inline-block;padding:7px 12px;border-radius:999px;background-color:{content.BadgeBackground};color:{content.BadgeText};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">{Encode(content.Label)}</span>
                          <h1 style="margin:18px 0 10px;font-size:24px;line-height:32px;color:#102a43;">Hello {patientName},</h1>
                          <p style="margin:0;color:#486581;font-size:15px;line-height:24px;">{Encode(content.Message)}</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #d9e8f0;border-radius:10px;background-color:#f8fbfd;">
                            {rows}
                          </table>
                          <p style="margin:24px 0 0;padding:14px 16px;border-left:4px solid {content.Accent};background-color:#f4f9fb;color:#334e68;font-size:14px;line-height:22px;">{Encode(content.Instruction)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 30px;background-color:#eef6f8;border-top:1px solid #d9e8f0;">
                          <p style="margin:0;color:#526d82;font-size:13px;line-height:20px;">Thank you for choosing {hospitalName}.</p>
                          {contact}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static string DetailRow(string label, string value) =>
        $"""
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #e6eff4;color:#627d98;font-size:13px;font-weight:700;width:34%;vertical-align:top;">{label}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #e6eff4;color:#243b53;font-size:14px;line-height:20px;vertical-align:top;">{value}</td>
          </tr>
        """;

    private static StatusTemplateContent StatusContent(string status, string? reason) =>
        status switch
        {
            "rejected" => new(
                "Rejected",
                "#fde8e8",
                "#b42318",
                "#dc2626",
                "Unfortunately, your appointment request could not be accepted.",
                string.IsNullOrWhiteSpace(reason)
                    ? "You may contact the hospital or submit a new appointment request."
                    : "Please contact the hospital if you need further assistance."),
            "rescheduled" => new(
                "Rescheduled",
                "#e0f2fe",
                "#075985",
                "#0284c7",
                "Your appointment request has been rescheduled.",
                "Please review the new time and contact us if it does not work for you."),
            _ => new(
                "Confirmed",
                "#dcfce7",
                "#166534",
                "#16a34a",
                "Your appointment request has been confirmed.",
                "Please arrive 10 minutes before your appointment.")
        };

    private static string StatusKey(string? status) =>
        status?.Trim().ToLowerInvariant() ?? string.Empty;

    private static string Clean(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static string Encode(string value) => WebUtility.HtmlEncode(value);

    private sealed record StatusTemplateContent(
        string Label,
        string BadgeBackground,
        string BadgeText,
        string Accent,
        string Message,
        string Instruction);
}
