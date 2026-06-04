using HMS.Api.Controllers.Admin;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace HMS.Tests.Controllers;

public sealed class AdminAuditLogsControllerTests
{
    [Fact]
    public async Task Query_ReturnsPagedAuditLogsWithFilters()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var user = new User { UserName = "auditor", Email = "auditor@hms.test", IsActive = true };
        var insideRange = DateTime.UtcNow.AddDays(-2);
        var outsideRange = DateTime.UtcNow.AddDays(-10);
        db.AuditLogs.AddRange(
            new AuditLog
            {
                User = user,
                Action = "Updated",
                Entity = "Patient",
                EntityId = 1,
                CreatedAt = insideRange,
                UpdatedAt = insideRange
            },
            new AuditLog
            {
                Action = "Created",
                Entity = "Appointment",
                EntityId = 2,
                CreatedAt = outsideRange,
                UpdatedAt = outsideRange
            });
        await db.SaveChangesAsync();
        var configuration = new ConfigurationBuilder().Build();
        var controller = new AdminAuditLogsController(db, configuration);

        var result = await controller.Query(
            from: DateTimeOffset.UtcNow.AddDays(-5),
            to: DateTimeOffset.UtcNow,
            skip: 0,
            take: 10,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "totalCount"));
        var items = AnonymousObjectAssertions.GetProperty<IEnumerable<object>>(ok.Value, "items");
        Assert.Single(items);
    }
}
