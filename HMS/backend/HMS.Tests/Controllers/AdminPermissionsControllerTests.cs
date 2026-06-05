using HMS.Api.Controllers.Admin;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Tests.Controllers;

public sealed class AdminPermissionsControllerTests
{
    [Fact]
    public async Task ListPermissions_ReturnsPermissionsOrderedByName()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Permissions.AddRange(
            new Permission { Name = "Zeta.Permission", Description = "Last" },
            new Permission { Name = "Alpha.Permission", Description = "First" });
        await db.SaveChangesAsync();
        var controller = new AdminPermissionsController(ServiceTestFactory.RoleAdministrationService(db));

        var result = await controller.ListPermissions(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var names = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value)
            .Select(item => AnonymousObjectAssertions.GetProperty<string>(item, "Name"))
            .ToList();
        Assert.Equal(["Alpha.Permission", "Zeta.Permission"], names);
    }
}

