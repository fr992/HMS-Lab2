using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HMS.Persistence;

public sealed class HmsDbContextFactory : IDesignTimeDbContextFactory<HmsDbContext>
{
    public HmsDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("HMS_EF_CONNECTION")
            ?? "Server=localhost\\SQLEXPRESS01;Database=HMS;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

        var options = new DbContextOptionsBuilder<HmsDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new HmsDbContext(options);
    }
}
