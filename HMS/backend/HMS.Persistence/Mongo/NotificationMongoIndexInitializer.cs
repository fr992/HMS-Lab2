using MongoDB.Driver;

namespace HMS.Persistence.Mongo;

public sealed class NotificationMongoIndexInitializer : INotificationMongoIndexInitializer
{
    private readonly IMongoDatabase _database;
    private int _created;

    public NotificationMongoIndexInitializer(IMongoDatabase database)
    {
        _database = database;
    }

    public async Task EnsureCreatedAsync(CancellationToken cancellationToken)
    {
        if (Interlocked.CompareExchange(ref _created, 1, 0) != 0)
            return;

        var collection = _database.GetCollection<NotificationDocument>("notifications");

        var userCreatedAtIndex = new CreateIndexModel<NotificationDocument>(
            Builders<NotificationDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Descending(x => x.CreatedAt));

        var userReadCreatedAtIndex = new CreateIndexModel<NotificationDocument>(
            Builders<NotificationDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Ascending(x => x.IsRead)
                .Descending(x => x.CreatedAt));

        await collection.Indexes.CreateManyAsync(
            [userCreatedAtIndex, userReadCreatedAtIndex],
            cancellationToken: cancellationToken);
    }
}
