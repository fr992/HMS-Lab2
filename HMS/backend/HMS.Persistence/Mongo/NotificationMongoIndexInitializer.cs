using MongoDB.Driver;

namespace HMS.Persistence.Mongo;

public sealed class NotificationMongoIndexInitializer : INotificationMongoIndexInitializer
{
    private readonly IMongoCollection<NotificationDocument> _collection;
    private readonly SemaphoreSlim _initializationLock = new(1, 1);
    private bool _created;

    public NotificationMongoIndexInitializer(IMongoCollection<NotificationDocument> collection)
    {
        _collection = collection;
    }

    public async Task EnsureCreatedAsync(CancellationToken cancellationToken)
    {
        if (_created)
            return;

        await _initializationLock.WaitAsync(cancellationToken);
        try
        {
            if (_created)
                return;

            var userCreatedAtIndex = new CreateIndexModel<NotificationDocument>(
                Builders<NotificationDocument>.IndexKeys
                    .Ascending(x => x.UserId)
                    .Ascending(x => x.ClearedAt)
                    .Descending(x => x.CreatedAt),
                new CreateIndexOptions { Name = "ix_notifications_user_cleared_created" });

            var userReadCreatedAtIndex = new CreateIndexModel<NotificationDocument>(
                Builders<NotificationDocument>.IndexKeys
                    .Ascending(x => x.UserId)
                    .Ascending(x => x.ClearedAt)
                    .Ascending(x => x.IsRead)
                    .Descending(x => x.CreatedAt),
                new CreateIndexOptions { Name = "ix_notifications_user_cleared_read_created" });

            await _collection.Indexes.CreateManyAsync(
                [userCreatedAtIndex, userReadCreatedAtIndex],
                cancellationToken: cancellationToken);

            _created = true;
        }
        finally
        {
            _initializationLock.Release();
        }
    }
}
