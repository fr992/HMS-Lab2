namespace HMS.Persistence.Mongo;

public interface IMongoDbInitializer
{
    Task InitializeAsync(CancellationToken cancellationToken);
}
