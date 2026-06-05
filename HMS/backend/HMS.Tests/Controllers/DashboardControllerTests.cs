using HMS.Api.Controllers;
using HMS.Domain.Entities;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Tests.Controllers;

public sealed class DashboardControllerTests
{
    [Fact]
    public async Task PatientStats_ReturnsTotalPatientCount()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.PatientProfiles.AddRange(
            CreatePatient("Pat", "One"),
            CreatePatient("Pat", "Two"),
            CreatePatient("Pat", "Three"));
        await db.SaveChangesAsync();
        var controller = new DashboardController(ServiceTestFactory.DashboardQueryService(db));
        ControllerTestHelper.SetUser(controller, permissions: ["Patients.Read"]);

        var result = await controller.PatientStats(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(3, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "total"));
    }

    [Fact]
    public async Task ActiveDoctorStats_CountsOnlyActiveDoctorProfiles()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.DoctorProfiles.AddRange(
            CreateDoctor("Active", "One", isActive: true),
            CreateDoctor("Inactive", "Two", isActive: false));
        await db.SaveChangesAsync();
        var controller = new DashboardController(ServiceTestFactory.DashboardQueryService(db));
        ControllerTestHelper.SetUser(controller, permissions: ["Users.Read"]);

        var result = await controller.ActiveDoctorStats(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(1, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "count"));
        Assert.Equal("On duty", AnonymousObjectAssertions.GetProperty<string>(ok.Value, "label"));
    }

    [Fact]
    public async Task BedOccupancy_CountsActiveBedsAndAssignments()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var patient = CreatePatient("Bed", "Patient");
        db.PatientProfiles.Add(patient);
        db.Beds.AddRange(
            new Bed { Ward = "general", BedNumber = "G-1", IsActive = true },
            new Bed { Ward = "general", BedNumber = "G-2", IsActive = true },
            new Bed { Ward = "icu", BedNumber = "I-1", IsActive = false });
        await db.SaveChangesAsync();
        var occupiedBed = db.Beds.First(b => b.BedNumber == "G-1");
        db.BedAssignments.Add(new BedAssignment
        {
            Bed = occupiedBed,
            PatientProfile = patient,
            AssignedAt = DateTime.UtcNow,
            AssignedByUserId = 1,
            AssignedByUser = new User { UserName = "admin", Email = "admin@hms.test", IsActive = true },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        var controller = new DashboardController(ServiceTestFactory.DashboardQueryService(db));
        ControllerTestHelper.SetUser(controller, permissions: ["Beds.Read"]);

        var result = await controller.BedOccupancy(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(2, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "total"));
        Assert.Equal(1, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "occupied"));
        Assert.Equal(1, AnonymousObjectAssertions.GetProperty<int>(ok.Value, "available"));
    }

    [Fact]
    public async Task Alerts_IncludesPendingLabAndBedRequestAlerts()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.LabRequestItems.Add(new LabRequestItem
        {
            Status = LabRequestStatus.Requested,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.BedAssignmentRequests.Add(new BedAssignmentRequest
        {
            Status = BedAssignmentRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        var controller = new DashboardController(ServiceTestFactory.DashboardQueryService(db));

        var result = await controller.Alerts(limit: 10, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var alerts = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value).ToList();
        Assert.Equal(2, alerts.Count);
        Assert.Contains(alerts, alert => AnonymousObjectAssertions.GetProperty<string>(alert, "title") == "Pending lab results");
        Assert.Contains(alerts, alert => AnonymousObjectAssertions.GetProperty<string>(alert, "title") == "Bed requests waiting");
    }

    [Fact]
    public async Task RecentPatients_ReturnsLatestPatientsWithDerivedStatus()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var older = CreatePatient("Older", "Patient");
        older.CreatedAt = DateTime.UtcNow.AddHours(-2);
        older.UpdatedAt = older.CreatedAt;
        var newer = CreatePatient("Newer", "Patient");
        newer.Person.DateOfBirth = new DateTime(1990, 5, 1);
        newer.CreatedAt = DateTime.UtcNow;
        newer.UpdatedAt = newer.CreatedAt;
        db.PatientProfiles.AddRange(older, newer);
        await db.SaveChangesAsync();
        var controller = new DashboardController(ServiceTestFactory.DashboardQueryService(db));
        ControllerTestHelper.SetUser(controller, permissions: ["Patients.Read"]);

        var result = await controller.RecentPatients(limit: 1, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var patients = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value).ToList();
        var patient = Assert.Single(patients);
        Assert.Equal("Newer Patient", AnonymousObjectAssertions.GetProperty<string>(patient, "name"));
        Assert.Equal("Waiting", AnonymousObjectAssertions.GetProperty<string>(patient, "status"));
    }

    private static PatientProfile CreatePatient(string firstName, string lastName)
    {
        var now = DateTime.UtcNow;
        return new PatientProfile
        {
            PatientNumber = $"P-{lastName}",
            CreatedAt = now,
            UpdatedAt = now,
            Person = new Person
            {
                FirstName = firstName,
                LastName = lastName
            }
        };
    }

    private static DoctorProfile CreateDoctor(string firstName, string lastName, bool isActive)
    {
        return new DoctorProfile
        {
            IsActive = isActive,
            LicenseNumber = $"DOC-{lastName}",
            StaffProfile = new StaffProfile
            {
                StaffNumber = $"S-{lastName}",
                Person = new Person { FirstName = firstName, LastName = lastName }
            }
        };
    }

}

