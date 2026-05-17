using HMS.Api.Hubs;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.SignalR;

namespace HMS.Api.Notifications;

public sealed class SignalRNotificationRealtimeSender : INotificationRealtimeSender
{
    private const string NotificationReceivedEvent = "notificationReceived";

    private readonly IHubContext<NotificationsHub> _hubContext;

    public SignalRNotificationRealtimeSender(IHubContext<NotificationsHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task SendToUserAsync(
        int userId,
        NotificationDto notification,
        CancellationToken cancellationToken)
    {
        return _hubContext.Clients
            .Group(NotificationsHub.GroupName(userId))
            .SendAsync(NotificationReceivedEvent, notification, cancellationToken);
    }
}
