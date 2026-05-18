using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace HMS.Persistence.Mongo;

public sealed class MongoDbInitializer : IMongoDbInitializer
{
    private readonly IMongoDatabase _database;
    private readonly INotificationMongoIndexInitializer _notificationIndexInitializer;
    private readonly MongoDbSettings _settings;
    private readonly ILogger<MongoDbInitializer> _logger;

    public MongoDbInitializer(
        IMongoDatabase database,
        INotificationMongoIndexInitializer notificationIndexInitializer,
        MongoDbSettings settings,
        ILogger<MongoDbInitializer> logger)
    {
        _database = database;
        _notificationIndexInitializer = notificationIndexInitializer;
        _settings = settings;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await _database.RunCommandAsync((Command<BsonDocument>)"{ping:1}", cancellationToken: cancellationToken);
        await _notificationIndexInitializer.EnsureCreatedAsync(cancellationToken);

        _logger.LogInformation(
            "MongoDB initialized for database {DatabaseName} and notifications collection {CollectionName}.",
            _settings.DatabaseName,
            _settings.NotificationsCollectionName);
    }
}
