namespace HMS.Persistence.Mongo;

public interface INotificationMongoIndexInitializer
{
    Task EnsureCreatedAsync(CancellationToken cancellationToken);
}
