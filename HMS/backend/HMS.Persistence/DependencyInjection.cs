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
        services.AddDbContext<HmsDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("Default")));

        var mongoDbSettings = GetRequiredMongoSettings(configuration);

        services.AddSingleton(mongoDbSettings);
        services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoDbSettings.ConnectionString));

        services.AddSingleton(serviceProvider =>
        {
            var client = serviceProvider.GetRequiredService<IMongoClient>();

            return client.GetDatabase(mongoDbSettings.DatabaseName);
        });
        services.AddSingleton<INotificationMongoIndexInitializer, NotificationMongoIndexInitializer>();

        return services;
    }

    private static MongoDbSettings GetRequiredMongoSettings(IConfiguration configuration)
    {
        var section = configuration.GetSection(MongoDbSettings.SectionName);
        var settings = new MongoDbSettings
        {
            ConnectionString = section[nameof(MongoDbSettings.ConnectionString)] ?? string.Empty,
            DatabaseName = section[nameof(MongoDbSettings.DatabaseName)] ?? string.Empty
        };

        if (string.IsNullOrWhiteSpace(settings.ConnectionString))
        {
            throw new InvalidOperationException("MongoDb:ConnectionString is required.");
        }

        if (string.IsNullOrWhiteSpace(settings.DatabaseName))
        {
            throw new InvalidOperationException("MongoDb:DatabaseName is required.");
        }

        return settings;
    }
}
