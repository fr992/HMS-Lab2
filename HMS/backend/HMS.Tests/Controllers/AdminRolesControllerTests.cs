using HMS.Api.Controllers.Admin;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HMS.Tests.Controllers;

public sealed class AdminRolesControllerTests
{
    [Fact]
    public async Task ListRoles_ReturnsPagedRolesWithPermissions()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var permission = new Permission { Name = "Patients.Read" };
        var role = new Role { Name = "Receptionist", Description = "Front desk" };
        role.RolePermissions.Add(new RolePermission { Permission = permission, Role = role });
        db.Roles.Add(role);
        await db.SaveChangesAsync();
        var controller = new AdminRolesController(db, NullLogger<AdminRolesController>.Instance);

        var result = await controller.ListRoles(new PaginationQuery { Page = 1, PageSize = 10 }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(1, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "TotalCount"));
        var listedRole = Assert.Single(AnonymousObjectAssertions.GetProperty<IEnumerable<object>>(ok.Value, "Items"));
        var permissionNames = AnonymousObjectAssertions.GetProperty<IEnumerable<string>>(listedRole, "PermissionNames");
        Assert.Contains("Patients.Read", permissionNames);
    }

    [Fact]
    public async Task CreateRole_WhenNameAlreadyExists_ReturnsBadRequest()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Roles.Add(new Role { Name = "Nurse", Description = "Existing" });
        await db.SaveChangesAsync();
        var controller = new AdminRolesController(db, NullLogger<AdminRolesController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.CreateRole(
            new RoleUpsertRequest { Name = "Nurse", PermissionNames = [] },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateRole_WhenPermissionsAreValid_ReturnsCreated()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Permissions.Add(new Permission { Name = "Appointments.Read" });
        await db.SaveChangesAsync();
        var controller = new AdminRolesController(db, NullLogger<AdminRolesController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.CreateRole(
            new RoleUpsertRequest
            {
                Name = "Scheduler",
                Description = "Schedules visits",
                PermissionNames = ["Appointments.Read"]
            },
            CancellationToken.None);

        Assert.IsType<CreatedResult>(result);
        var role = await db.Roles.SingleAsync(r => r.Name == "Scheduler");
        var permissionNames = await db.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Name)
            .ToListAsync();
        Assert.Equal(["Appointments.Read"], permissionNames);
    }

    [Fact]
    public async Task UpdateRole_WhenRoleIsSuperAdmin_ReturnsBadRequest()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Roles.Add(new Role { Name = "SuperAdmin", Description = "System" });
        await db.SaveChangesAsync();
        var roleId = db.Roles.Single().Id;
        var controller = new AdminRolesController(db, NullLogger<AdminRolesController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.UpdateRole(
            roleId,
            new RoleUpsertRequest { Name = "SuperAdmin", PermissionNames = [] },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteRole_WhenAssignedToUsers_ReturnsBadRequest()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var role = new Role { Name = "Doctor", Description = "Clinical" };
        var user = new User { UserName = "doctor1", Email = "doctor1@hms.test", IsActive = true };
        user.UserRoles.Add(new UserRole { Role = role, User = user, AssignedAt = DateTime.UtcNow });
        db.Users.Add(user);
        db.Roles.Add(role);
        await db.SaveChangesAsync();
        var controller = new AdminRolesController(db, NullLogger<AdminRolesController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.DeleteRole(role.Id, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteRole_WhenUnused_ReturnsNoContent()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var role = new Role { Name = "TempRole", Description = "Disposable" };
        db.Roles.Add(role);
        await db.SaveChangesAsync();
        var controller = new AdminRolesController(db, NullLogger<AdminRolesController>.Instance);
        ControllerTestHelper.SetUser(controller, userId: 1, roles: ["SuperAdmin"]);

        var result = await controller.DeleteRole(role.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(db.Roles);
    }
}
