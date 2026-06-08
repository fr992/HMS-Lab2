using HMS.Persistence.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HMS.Persistence;

public sealed class HmsDbContextFactory : IDesignTimeDbContextFactory<HmsDbContext>
{
    public HmsDbContext CreateDbContext(string[] args)
    {
        DotEnvLoader.Load();

        var connectionString = Environment.GetEnvironmentVariable("HMS_EF_CONNECTION")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__HMS");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "HMS_EF_CONNECTION or ConnectionStrings__HMS must be configured for EF design-time operations.");
        }

        var options = new DbContextOptionsBuilder<HmsDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new HmsDbContext(options);
    }
}
