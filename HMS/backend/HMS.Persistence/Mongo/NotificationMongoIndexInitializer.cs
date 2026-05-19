using MongoDB.Bson;
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

            await EnsureIndexAsync(
                new BsonDocument
                {
                    { nameof(NotificationDocument.UserId), 1 },
                    { nameof(NotificationDocument.ClearedAt), 1 },
                    { nameof(NotificationDocument.CreatedAt), -1 }
                },
                "ix_notifications_user_cleared_created",
                cancellationToken);

            await EnsureIndexAsync(
                new BsonDocument
                {
                    { nameof(NotificationDocument.UserId), 1 },
                    { nameof(NotificationDocument.ClearedAt), 1 },
                    { nameof(NotificationDocument.IsRead), 1 },
                    { nameof(NotificationDocument.CreatedAt), -1 }
                },
                "ix_notifications_user_cleared_read_created",
                cancellationToken);

            _created = true;
        }
        finally
        {
            _initializationLock.Release();
        }
    }

    private async Task EnsureIndexAsync(
        BsonDocument key,
        string name,
        CancellationToken cancellationToken)
    {
        var existingIndexes = await GetExistingIndexesAsync(cancellationToken);
        if (existingIndexes.Any(index => HasSameKey(index, key)))
            return;

        var model = new CreateIndexModel<NotificationDocument>(
            key,
            new CreateIndexOptions { Name = name });

        try
        {
            await _collection.Indexes.CreateOneAsync(model, cancellationToken: cancellationToken);
        }
        catch (MongoCommandException exception) when (IsEquivalentIndexNameConflict(exception))
        {
            existingIndexes = await GetExistingIndexesAsync(cancellationToken);
            if (existingIndexes.Any(index => HasSameKey(index, key)))
                return;

            throw;
        }
    }

    private async Task<IReadOnlyList<BsonDocument>> GetExistingIndexesAsync(
        CancellationToken cancellationToken)
    {
        using var cursor = await _collection.Indexes.ListAsync(cancellationToken);

        return await cursor.ToListAsync(cancellationToken);
    }

    private static bool HasSameKey(BsonDocument index, BsonDocument expectedKey)
    {
        return index.TryGetValue("key", out var value)
            && value.IsBsonDocument
            && AreKeysEqual(value.AsBsonDocument, expectedKey);
    }

    private static bool AreKeysEqual(BsonDocument left, BsonDocument right)
    {
        if (left.ElementCount != right.ElementCount)
            return false;

        for (var i = 0; i < left.ElementCount; i++)
        {
            var leftElement = left.GetElement(i);
            var rightElement = right.GetElement(i);

            if (leftElement.Name != rightElement.Name || !leftElement.Value.Equals(rightElement.Value))
                return false;
        }

        return true;
    }

    private static bool IsEquivalentIndexNameConflict(MongoCommandException exception)
    {
        return exception.CodeName is "IndexOptionsConflict" or "IndexKeySpecsConflict"
            || exception.Message.Contains("Index already exists with a different name", StringComparison.OrdinalIgnoreCase);
    }
}
