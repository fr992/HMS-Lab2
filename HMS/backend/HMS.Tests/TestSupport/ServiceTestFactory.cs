using HMS.Application.Abstractions.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using HMS.Persistence.Repositories;
using Identity.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace HMS.Tests.TestSupport;

public static class ServiceTestFactory
{
    public static IDepartmentService DepartmentService(HmsDbContext db)
    {
        return new DepartmentService(
            new EfRepository<Department>(db),
            new EfHmsRepository(db),
            new EfUnitOfWork(db));
    }

    public static IStaffDirectoryService StaffDirectoryService(HmsDbContext db)
    {
        return new StaffDirectoryService(new EfHmsRepository(db));
    }

    public static ILandingStatsService LandingStatsService(HmsDbContext db)
    {
        return new LandingStatsService(new EfHmsRepository(db));
    }

    public static IDashboardQueryService DashboardQueryService(HmsDbContext db)
    {
        return new DashboardQueryService(new EfHmsRepository(db));
    }

    public static IRoleAdministrationService RoleAdministrationService(HmsDbContext db)
    {
        return new RoleAdministrationService(
            new EfHmsRepository(db),
            new EfUnitOfWork(db));
    }

    public static IAuditLogQueryService AuditLogQueryService(
        HmsDbContext db,
        IConfiguration configuration)
    {
        return new AuditLogQueryService(new AuditLogRepository(db, configuration));
    }
}
