using HMS.Api.Controllers.Public;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Hosting;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class PublicControllersTests
{
    [Fact]
    public async Task PublicDepartments_WhenAllRequested_ReturnsAllDepartmentsOrderedByName()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Set<Department>().AddRange(
            new Department { Name = "Neurology", Description = "Nerves" },
            new Department { Name = "Cardiology", Description = "Heart" });
        await db.SaveChangesAsync();
        var controller = new PublicDepartmentsController(db);

        var result = await controller.GetDepartments(new PaginationQuery { PageSize = 1 }, all: true, CancellationToken.None);

        var page = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(["Cardiology", "Neurology"], page.Items.Select(d => d.Name));
        Assert.Equal(1, page.Page);
        Assert.False(page.HasNextPage);
    }

    [Fact]
    public async Task PublicDoctors_ReturnsOnlyActiveDoctorUsersAndAppliesLimit()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.DoctorProfiles.AddRange(
            CreateDoctor("Zoe", "Zeta", isDoctorRole: true, isUserActive: true, isDoctorActive: true),
            CreateDoctor("Ana", "Alpha", isDoctorRole: true, isUserActive: true, isDoctorActive: true),
            CreateDoctor("Inactive", "User", isDoctorRole: true, isUserActive: false, isDoctorActive: true),
            CreateDoctor("Wrong", "Role", isDoctorRole: false, isUserActive: true, isDoctorActive: true),
            CreateDoctor("Inactive", "Doctor", isDoctorRole: true, isUserActive: true, isDoctorActive: false));
        await db.SaveChangesAsync();
        var controller = new PublicDoctorsController(db);

        var result = await controller.GetDoctors(CancellationToken.None, limit: 1);

        var doctors = ControllerTestHelper.AssertOkValue(result);
        var doctor = Assert.Single(doctors);
        Assert.Equal("Ana Alpha", doctor.FullName);
        Assert.Equal("ana.alpha@example.test", doctor.Email);
    }

    [Fact]
    public async Task LandingStats_CountsCorePublicMetrics()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var activeDoctor = CreateDoctor("Active", "Doctor", isDoctorRole: true, isUserActive: true, isDoctorActive: true);
        var inactiveDoctor = CreateDoctor("Inactive", "Doctor", isDoctorRole: true, isUserActive: true, isDoctorActive: false);
        db.DoctorProfiles.AddRange(activeDoctor, inactiveDoctor);
        db.PatientProfiles.Add(new PatientProfile { Person = CreatePerson("Pat", "One"), PatientNumber = "P-001" });
        db.Set<StaffProfile>().Add(new StaffProfile { Person = CreatePerson("Staff", "Only"), StaffNumber = "S-001" });
        db.Set<Department>().Add(new Department { Name = "Cardiology" });
        db.Set<Specialization>().Add(new Specialization { Name = "Pediatrics" });
        db.Appointments.Add(new Appointment
        {
            PatientProfile = new PatientProfile { Person = CreatePerson("Pat", "Two"), PatientNumber = "P-002" },
            DoctorProfile = activeDoctor,
            ScheduledStart = DateTime.UtcNow,
            ScheduledEnd = DateTime.UtcNow.AddMinutes(30)
        });
        await db.SaveChangesAsync();
        var controller = new LandingStatsController(db);

        var result = await controller.Get(CancellationToken.None);

        var stats = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(1, stats.Doctors);
        Assert.Equal(2, stats.Patients);
        Assert.Equal(3, stats.Staff);
        Assert.Equal(1, stats.Departments);
        Assert.Equal(1, stats.Specialties);
        Assert.Equal(1, stats.Appointments);
    }

    [Fact]
    public async Task PublicSettings_ReturnsOnlyAllowlistedPublicSettings()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.Settings.AddRange(
            new Setting { Key = "hospital.name", Value = "Care Center", UpdatedAt = DateTime.UtcNow },
            new Setting { Key = "landing.heroTitle", Value = "Care that listens.", UpdatedAt = DateTime.UtcNow },
            new Setting { Key = "system.maintenanceMode", Value = "true", UpdatedAt = DateTime.UtcNow },
            new Setting { Key = "security.sessionTimeoutMinutes", Value = "15", UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(item => item.ContentRootPath).Returns(AppContext.BaseDirectory);
        var controller = new PublicSettingsController(db, environment.Object);

        var result = await controller.Get(CancellationToken.None);

        var settings = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal("Care Center", settings["hospital.name"]);
        Assert.Equal("Care that listens.", settings["landing.heroTitle"]);
        Assert.DoesNotContain("system.maintenanceMode", settings.Keys);
        Assert.DoesNotContain("security.sessionTimeoutMinutes", settings.Keys);
    }

    private static DoctorProfile CreateDoctor(
        string firstName,
        string lastName,
        bool isDoctorRole,
        bool isUserActive,
        bool isDoctorActive)
    {
        var person = CreatePerson(firstName, lastName, isUserActive);
        person.User!.UserRoles.Add(new UserRole
        {
            User = person.User,
            Role = new Role { Name = isDoctorRole ? "Doctor" : "Nurse" },
            AssignedAt = DateTime.UtcNow
        });

        return new DoctorProfile
        {
            IsActive = isDoctorActive,
            LicenseNumber = $"DOC-{lastName}",
            StaffProfile = new StaffProfile
            {
                Person = person,
                StaffNumber = $"S-{lastName}"
            }
        };
    }

    private static Person CreatePerson(string firstName, string lastName, bool isUserActive = true)
    {
        return new Person
        {
            FirstName = firstName,
            LastName = lastName,
            User = new User
            {
                UserName = $"{firstName}.{lastName}".ToLowerInvariant(),
                Email = $"{firstName}.{lastName}@example.test".ToLowerInvariant(),
                IsActive = isUserActive
            }
        };
    }
}
