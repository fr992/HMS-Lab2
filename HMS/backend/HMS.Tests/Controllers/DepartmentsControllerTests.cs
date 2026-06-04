using HMS.Api.Controllers.Reception;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Tests.TestSupport;

namespace HMS.Tests.Controllers;

public sealed class DepartmentsControllerTests
{
    [Fact]
    public async Task GetDepartments_ReturnsPagedDepartments()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Set<Department>().AddRange(
            new Department { Name = "Cardiology" },
            new Department { Name = "Neurology" },
            new Department { Name = "Oncology" });
        await db.SaveChangesAsync();
        var controller = new DepartmentsController(db);
        ControllerTestHelper.SetUser(controller, permissions: ["Patients.Read"]);

        var result = await controller.GetDepartments(
            new PaginationQuery { Page = 2, PageSize = 2 },
            all: false,
            CancellationToken.None);

        var page = ControllerTestHelper.AssertOkValue(result);
        Assert.Single(page.Items);
        Assert.Equal(3, page.TotalCount);
        Assert.True(page.HasPreviousPage);
    }

    [Fact]
    public async Task GetDepartments_AppliesSearchBeforePagination()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Set<Department>().AddRange(
            new Department { Name = "Cardiology" },
            new Department { Name = "Neurology" },
            new Department { Name = "Oncology" });
        await db.SaveChangesAsync();
        var controller = new DepartmentsController(db);
        ControllerTestHelper.SetUser(controller, permissions: ["Patients.Read"]);

        var result = await controller.GetDepartments(
            new PaginationQuery { Search = "ology", Page = 1, PageSize = 25 },
            all: false,
            CancellationToken.None);

        var page = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(3, page.Items.Count);
        Assert.All(page.Items, item => Assert.Contains("ology", item.Name));
    }

    [Fact]
    public async Task GetDepartments_WhenAllRequested_ReturnsSinglePageWithAllItems()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Set<Department>().AddRange(
            new Department { Name = "Cardiology" },
            new Department { Name = "Neurology" });
        await db.SaveChangesAsync();
        var controller = new DepartmentsController(db);
        ControllerTestHelper.SetUser(controller, permissions: ["Patients.Read"]);

        var result = await controller.GetDepartments(new PaginationQuery { PageSize = 1 }, all: true, CancellationToken.None);

        var page = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(1, page.Page);
        Assert.False(page.HasNextPage);
    }
}
