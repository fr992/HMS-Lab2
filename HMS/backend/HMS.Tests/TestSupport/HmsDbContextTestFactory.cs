using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HMS.Tests.TestSupport;

internal static class HmsDbContextTestFactory
{
    public static HmsDbContext Create()
    {
        var options = new DbContextOptionsBuilder<HmsDbContext>()
            .UseInMemoryDatabase($"hms-tests-{Guid.NewGuid():N}")
            .Options;

        return new HmsDbContext(options);
    }
}
