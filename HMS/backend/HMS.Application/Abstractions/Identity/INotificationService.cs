using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface INotificationService
{
    Task<NotificationDto> CreateAsync(CreateNotificationRequestDto request, CancellationToken cancellationToken);

    Task<PaginatedResponse<NotificationDto>> GetForUserAsync(
        int userId,
        bool? isRead,
        PaginationQuery pagination,
        CancellationToken cancellationToken);

    Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken);

    Task MarkAsReadAsync(string id, int userId, CancellationToken cancellationToken);

    Task MarkAllAsReadAsync(int userId, CancellationToken cancellationToken);

    Task ClearAsync(string id, int userId, CancellationToken cancellationToken);

    Task ClearAllAsync(int userId, CancellationToken cancellationToken);
}
