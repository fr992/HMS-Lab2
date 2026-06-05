using HMS.Api.Controllers.Admin;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HMS.Tests.Controllers;

public sealed class AdminRolePermissionsControllerTests
{
    [Fact]
    public async Task GetForRole_WhenRoleMissing_ReturnsNotFound()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var controller = new AdminRolePermissionsController(ServiceTestFactory.RoleAdministrationService(db), NullLogger<AdminRolePermissionsController>.Instance);

        var result = await controller.GetForRole(404, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task SetRolePermissions_WhenPermissionIsUnknown_ReturnsBadRequest()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Roles.Add(new Role { Name = "LabTech", Description = "Lab" });
        await db.SaveChangesAsync();
        var roleId = db.Roles.Single().Id;
        var controller = new AdminRolePermissionsController(ServiceTestFactory.RoleAdministrationService(db), NullLogger<AdminRolePermissionsController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.SetRolePermissions(
            roleId,
            new SetRolePermissionsDto { PermissionNames = ["Missing.Permission"] },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SetRolePermissions_WhenRoleIsSuperAdmin_ReturnsBadRequest()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Roles.Add(new Role { Name = "SuperAdmin", Description = "System" });
        await db.SaveChangesAsync();
        var roleId = db.Roles.Single().Id;
        var controller = new AdminRolePermissionsController(ServiceTestFactory.RoleAdministrationService(db), NullLogger<AdminRolePermissionsController>.Instance);

        var result = await controller.SetRolePermissions(
            roleId,
            new SetRolePermissionsDto { PermissionNames = [] },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SetRolePermissions_ReplacesExistingPermissions()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var oldPermission = new Permission { Name = "Old.Permission" };
        var newPermission = new Permission { Name = "New.Permission" };
        var role = new Role { Name = "Analyst", Description = "Reports" };
        role.RolePermissions.Add(new RolePermission { Permission = oldPermission, Role = role });
        db.Roles.Add(role);
        db.Permissions.Add(newPermission);
        await db.SaveChangesAsync();
        var controller = new AdminRolePermissionsController(ServiceTestFactory.RoleAdministrationService(db), NullLogger<AdminRolePermissionsController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.SetRolePermissions(
            role.Id,
            new SetRolePermissionsDto { PermissionNames = ["New.Permission"] },
            CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        var names = await db.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Name)
            .ToListAsync();
        Assert.Equal(["New.Permission"], names);
    }
}

