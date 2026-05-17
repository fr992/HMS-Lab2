using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface INotificationRealtimeSender
{
    Task SendToUserAsync(int userId, NotificationDto notification, CancellationToken cancellationToken);
}
