using System.Net;
using System.Net.Mail;
using HMS.Application.Abstractions.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Identity.Infrastructure.Notifications;

public sealed class SmtpEmailNotificationService : IEmailNotificationService
{
    private readonly EmailNotificationSettings _settings;
    private readonly ILogger<SmtpEmailNotificationService> _logger;

    public SmtpEmailNotificationService(
        IOptions<EmailNotificationSettings> settings,
        ILogger<SmtpEmailNotificationService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string recipientEmail,
        string subject,
        string message,
        CancellationToken cancellationToken)
    {
        if (!_settings.Enabled)
        {
            throw new InvalidOperationException("Email notifications are disabled.");
        }

        EnsureConfigured();
        using var mail = new MailMessage
        {
            From = new MailAddress(_settings.FromAddress, _settings.FromName),
            Subject = subject,
            Body = message,
            IsBodyHtml = false
        };
        mail.To.Add(recipientEmail);

        using var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = _settings.UseSsl
        };
        if (!string.IsNullOrWhiteSpace(_settings.UserName))
            client.Credentials = new NetworkCredential(_settings.UserName, _settings.Password);

        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(mail, cancellationToken);
        _logger.LogInformation("Appointment email sent to {RecipientEmail}.", recipientEmail);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.Host)
            || string.IsNullOrWhiteSpace(_settings.FromAddress))
        {
            throw new InvalidOperationException("SMTP email notifications are enabled but not fully configured.");
        }
    }
}
