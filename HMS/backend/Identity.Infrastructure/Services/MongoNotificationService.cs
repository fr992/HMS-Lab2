using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Persistence.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Identity.Infrastructure.Services;

public sealed class MongoNotificationService : INotificationService
{
    private const int DefaultLimit = 50;

    private readonly IMongoCollection<NotificationDocument> _notifications;
    private readonly INotificationMongoIndexInitializer _indexInitializer;
    private readonly INotificationRealtimeSender _realtimeSender;
    private readonly ILogger<MongoNotificationService> _logger;

    public MongoNotificationService(
        IMongoCollection<NotificationDocument> notifications,
        INotificationMongoIndexInitializer indexInitializer,
        INotificationRealtimeSender realtimeSender,
        ILogger<MongoNotificationService> logger)
    {
        _notifications = notifications;
        _indexInitializer = indexInitializer;
        _realtimeSender = realtimeSender;
        _logger = logger;
    }

    public async Task<NotificationDto> CreateAsync(
        CreateNotificationRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.UserId <= 0)
            throw new BadRequestException("Notification user is required.");

        var type = NormalizeRequired(request.Type, "Notification type is required.");
        var title = NormalizeRequired(request.Title, "Notification title is required.");
        var message = NormalizeRequired(request.Message, "Notification message is required.");
        var now = DateTime.UtcNow;

        var document = new NotificationDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = request.UserId,
            Type = type,
            Title = title,
            Message = message,
            IsRead = false,
            ReadAt = null,
            ClearedAt = null,
            RelatedEntityType = NormalizeOptional(request.RelatedEntityType),
            RelatedEntityId = NormalizeOptional(request.RelatedEntityId),
            CreatedAt = now
        };

        await _indexInitializer.EnsureCreatedAsync(cancellationToken);
        await _notifications.InsertOneAsync(document, cancellationToken: cancellationToken);

        var notification = ToDto(document);
        await TrySendRealtimeAsync(document.UserId, notification, cancellationToken);

        return notification;
    }

    public async Task<IReadOnlyList<NotificationDto>> GetForUserAsync(
        int userId,
        bool? isRead,
        CancellationToken cancellationToken)
    {
        EnsureValidUserId(userId);

        var filter = ActiveUserFilter(userId);
        if (isRead.HasValue)
        {
            filter &= Builders<NotificationDocument>.Filter.Eq(x => x.IsRead, isRead.Value);
        }

        var documents = await _notifications
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .Limit(DefaultLimit)
            .ToListAsync(cancellationToken);

        return documents.Select(ToDto).ToList();
    }

    public async Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken)
    {
        EnsureValidUserId(userId);

        var filter = Builders<NotificationDocument>.Filter.And(
            ActiveUserFilter(userId),
            Builders<NotificationDocument>.Filter.Eq(x => x.IsRead, false));

        var count = await _notifications.CountDocumentsAsync(filter, cancellationToken: cancellationToken);

        return count > int.MaxValue ? int.MaxValue : (int)count;
    }

    public async Task MarkAsReadAsync(string id, int userId, CancellationToken cancellationToken)
    {
        EnsureValidUserId(userId);

        if (!ObjectId.TryParse(id, out var objectId))
            throw new NotFoundException("Notification not found.");

        var filter = Builders<NotificationDocument>.Filter.And(
            ActiveUserFilter(userId),
            Builders<NotificationDocument>.Filter.Eq(x => x.Id, objectId.ToString()),
            Builders<NotificationDocument>.Filter.Eq(x => x.UserId, userId));

        var update = Builders<NotificationDocument>.Update
            .Set(x => x.IsRead, true)
            .Set(x => x.ReadAt, DateTime.UtcNow);

        var result = await _notifications.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);

        if (result.MatchedCount == 0)
            throw new NotFoundException("Notification not found.");
    }

    public async Task MarkAllAsReadAsync(int userId, CancellationToken cancellationToken)
    {
        EnsureValidUserId(userId);

        var filter = Builders<NotificationDocument>.Filter.And(
            ActiveUserFilter(userId),
            Builders<NotificationDocument>.Filter.Eq(x => x.IsRead, false));

        var update = Builders<NotificationDocument>.Update
            .Set(x => x.IsRead, true)
            .Set(x => x.ReadAt, DateTime.UtcNow);

        await _notifications.UpdateManyAsync(filter, update, cancellationToken: cancellationToken);
    }

    public async Task ClearAsync(string id, int userId, CancellationToken cancellationToken)
    {
        EnsureValidUserId(userId);

        if (!ObjectId.TryParse(id, out var objectId))
            throw new NotFoundException("Notification not found.");

        var now = DateTime.UtcNow;
        var filter = Builders<NotificationDocument>.Filter.And(
            ActiveUserFilter(userId),
            Builders<NotificationDocument>.Filter.Eq(x => x.Id, objectId.ToString()));

        var update = Builders<NotificationDocument>.Update
            .Set(x => x.ClearedAt, now)
            .Set(x => x.IsRead, true)
            .Set(x => x.ReadAt, now);

        var result = await _notifications.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);

        if (result.MatchedCount == 0)
            throw new NotFoundException("Notification not found.");
    }

    public async Task ClearAllAsync(int userId, CancellationToken cancellationToken)
    {
        EnsureValidUserId(userId);

        var now = DateTime.UtcNow;
        var update = Builders<NotificationDocument>.Update
            .Set(x => x.ClearedAt, now)
            .Set(x => x.IsRead, true)
            .Set(x => x.ReadAt, now);

        await _notifications.UpdateManyAsync(
            ActiveUserFilter(userId),
            update,
            cancellationToken: cancellationToken);
    }

    private static NotificationDto ToDto(NotificationDocument document)
    {
        return new NotificationDto
        {
            Id = document.Id,
            UserId = document.UserId,
            Type = document.Type,
            Title = document.Title,
            Message = document.Message,
            IsRead = document.IsRead,
            ReadAt = document.ReadAt,
            ClearedAt = document.ClearedAt,
            RelatedEntityType = document.RelatedEntityType,
            RelatedEntityId = document.RelatedEntityId,
            CreatedAt = document.CreatedAt
        };
    }

    private static FilterDefinition<NotificationDocument> ActiveUserFilter(int userId)
    {
        return Builders<NotificationDocument>.Filter.And(
            Builders<NotificationDocument>.Filter.Eq(x => x.UserId, userId),
            Builders<NotificationDocument>.Filter.Eq(x => x.ClearedAt, null));
    }

    private static void EnsureValidUserId(int userId)
    {
        if (userId <= 0)
            throw new BadRequestException("Notification user is required.");
    }

    private static string NormalizeRequired(string? value, string errorMessage)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new BadRequestException(errorMessage);

        return value.Trim();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task TrySendRealtimeAsync(
        int userId,
        NotificationDto notification,
        CancellationToken cancellationToken)
    {
        try
        {
            await _realtimeSender.SendToUserAsync(userId, notification, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(
                ex,
                "Failed to send real-time notification {NotificationId} to user {UserId}.",
                notification.Id,
                userId);
        }
    }
}
