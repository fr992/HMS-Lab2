using HMS.Persistence.Mongo;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace HMS.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var sqlConnectionString = configuration.GetConnectionString("HMS")
            ?? configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:HMS or ConnectionStrings:Default is required.");

        services.AddDbContextPool<HmsDbContext>(options =>
            options.UseSqlServer(
                sqlConnectionString,
                sqlOptions => sqlOptions.EnableRetryOnFailure()));

        var mongoDbSettings = GetRequiredMongoSettings(configuration);

        services.AddSingleton(mongoDbSettings);
        services.AddSingleton<IMongoClient>(_ => CreateMongoClient(mongoDbSettings));

        services.AddSingleton<IMongoDatabase>(serviceProvider =>
        {
            var client = serviceProvider.GetRequiredService<IMongoClient>();

            return client.GetDatabase(mongoDbSettings.DatabaseName);
        });
        services.AddSingleton(serviceProvider =>
        {
            var database = serviceProvider.GetRequiredService<IMongoDatabase>();

            return database.GetCollection<NotificationDocument>(
                mongoDbSettings.NotificationsCollectionName);
        });
        services.AddSingleton<INotificationMongoIndexInitializer, NotificationMongoIndexInitializer>();
        services.AddSingleton<IMongoDbInitializer, MongoDbInitializer>();

        return services;
    }

    private static IMongoClient CreateMongoClient(MongoDbSettings settings)
    {
        var clientSettings = MongoClientSettings.FromConnectionString(settings.ConnectionString);
        var timeout = TimeSpan.FromSeconds(settings.ServerSelectionTimeoutSeconds);

        clientSettings.ServerSelectionTimeout = timeout;
        clientSettings.ConnectTimeout = timeout;

        return new MongoClient(clientSettings);
    }

    private static MongoDbSettings GetRequiredMongoSettings(IConfiguration configuration)
    {
        var section = configuration.GetSection(MongoDbSettings.SectionName);
        var settings = new MongoDbSettings
        {
            ConnectionString = section[nameof(MongoDbSettings.ConnectionString)] ?? string.Empty,
            DatabaseName = section[nameof(MongoDbSettings.DatabaseName)] ?? string.Empty,
            NotificationsCollectionName =
                section[nameof(MongoDbSettings.NotificationsCollectionName)]
                ?? "notifications",
            ServerSelectionTimeoutSeconds =
                GetIntOrDefault(section, nameof(MongoDbSettings.ServerSelectionTimeoutSeconds), 5)
        };

        if (string.IsNullOrWhiteSpace(settings.ConnectionString))
        {
            throw new InvalidOperationException("MongoDb:ConnectionString is required.");
        }

        if (string.IsNullOrWhiteSpace(settings.DatabaseName))
        {
            throw new InvalidOperationException("MongoDb:DatabaseName is required.");
        }

        if (string.IsNullOrWhiteSpace(settings.NotificationsCollectionName))
        {
            throw new InvalidOperationException("MongoDb:NotificationsCollectionName is required.");
        }

        if (settings.ServerSelectionTimeoutSeconds <= 0)
        {
            throw new InvalidOperationException("MongoDb:ServerSelectionTimeoutSeconds must be greater than zero.");
        }

        return settings;
    }

    private static int GetIntOrDefault(IConfiguration configuration, string key, int defaultValue)
    {
        return int.TryParse(configuration[key], out var value) ? value : defaultValue;
    }
}
