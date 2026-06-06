namespace HMS.Application.Abstractions.Identity;

public interface IEmailNotificationService
{
    Task SendAsync(
        string recipientEmail,
        string subject,
        string message,
        bool isBodyHtml,
        CancellationToken cancellationToken);
}
