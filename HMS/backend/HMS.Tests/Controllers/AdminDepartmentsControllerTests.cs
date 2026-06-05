using HMS.Api.Controllers.Admin;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Tests.Controllers;

public sealed class AdminDepartmentsControllerTests
{
    [Fact]
    public async Task GetDepartments_ReturnsPagedDepartments()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Set<Department>().AddRange(
            new Department { Name = "Cardiology", Description = "Heart care" },
            new Department { Name = "Neurology", Description = "Brain care" },
            new Department { Name = "Oncology", Description = "Cancer care" });
        await db.SaveChangesAsync();
        var controller = new AdminDepartmentsController(ServiceTestFactory.DepartmentService(db));

        var result = await controller.GetDepartments(
            new PaginationQuery { Page = 1, PageSize = 2 },
            all: false,
            CancellationToken.None);

        var page = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(3, page.TotalCount);
        Assert.True(page.HasNextPage);
    }

    [Fact]
    public async Task GetDepartments_WhenAllRequested_ReturnsAllDepartments()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Set<Department>().AddRange(
            new Department { Name = "Cardiology" },
            new Department { Name = "Neurology" },
            new Department { Name = "Oncology" });
        await db.SaveChangesAsync();
        var controller = new AdminDepartmentsController(ServiceTestFactory.DepartmentService(db));

        var result = await controller.GetDepartments(new PaginationQuery { PageSize = 1 }, all: true, CancellationToken.None);

        var page = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(3, page.Items.Count);
        Assert.Equal(3, page.TotalCount);
        Assert.False(page.HasNextPage);
    }

    [Fact]
    public async Task CreateDepartment_NormalizesValuesAndStoresCurrentUser()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var controller = new AdminDepartmentsController(ServiceTestFactory.DepartmentService(db));
        ControllerTestHelper.SetUser(controller, userId: 91, roles: ["Admin"]);

        var result = await controller.CreateDepartment(
            new CreateDepartmentDto { Name = "  Radiology  ", Description = "  Imaging  " },
            CancellationToken.None);

        var created = ControllerTestHelper.AssertCreatedValue(result, nameof(AdminDepartmentsController.GetDepartment));
        Assert.Equal("Radiology", created.Name);
        Assert.Equal("Imaging", created.Description);

        var stored = Assert.Single(db.Set<Department>());
        Assert.Equal(91, stored.CreatedById);
        Assert.Equal(91, stored.UpdatedById);
    }

    [Fact]
    public async Task UpdateDepartment_WhenMissing_ReturnsNotFound()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var controller = new AdminDepartmentsController(ServiceTestFactory.DepartmentService(db));

        var result = await controller.UpdateDepartment(
            404,
            new UpdateDepartmentDto { Name = "Missing" },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task DeleteDepartment_WhenDepartmentHasBedReference_ReturnsConflict()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var department = new Department { Name = "Ward" };
        db.Set<Department>().Add(department);
        await db.SaveChangesAsync();
        db.Beds.Add(new Bed { DepartmentId = department.Id, Ward = "A", RoomNumber = "101", BedNumber = "1" });
        await db.SaveChangesAsync();
        var controller = new AdminDepartmentsController(ServiceTestFactory.DepartmentService(db));

        var result = await controller.DeleteDepartment(department.Id, CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task DeleteDepartment_WhenUnused_RemovesDepartment()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var department = new Department { Name = "Temporary" };
        db.Set<Department>().Add(department);
        await db.SaveChangesAsync();
        var controller = new AdminDepartmentsController(ServiceTestFactory.DepartmentService(db));

        var result = await controller.DeleteDepartment(department.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(db.Set<Department>());
    }
}

