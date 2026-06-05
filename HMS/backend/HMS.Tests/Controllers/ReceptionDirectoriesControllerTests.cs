using HMS.Api.Controllers.Reception;
using HMS.Domain.Entities;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;

namespace HMS.Tests.Controllers;

public sealed class ReceptionDirectoriesControllerTests
{
    [Fact]
    public async Task Doctors_ReturnsActiveDoctorRoleUsersOrderedByName()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.DoctorProfiles.AddRange(
            CreateDoctor("Zoe", "Zeta", roleName: "Doctor", isUserActive: true, isProfileActive: true),
            CreateDoctor("Ana", "Alpha", roleName: "Doctor", isUserActive: true, isProfileActive: true),
            CreateDoctor("Wrong", "Role", roleName: "Nurse", isUserActive: true, isProfileActive: true),
            CreateDoctor("Inactive", "User", roleName: "Doctor", isUserActive: false, isProfileActive: true),
            CreateDoctor("Inactive", "Profile", roleName: "Doctor", isUserActive: true, isProfileActive: false));
        await db.SaveChangesAsync();
        var controller = new DoctorsController(ServiceTestFactory.StaffDirectoryService(db));
        ControllerTestHelper.SetUser(controller, permissions: ["Patients.Read"]);

        var result = await controller.GetDoctors(CancellationToken.None);

        var doctors = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(["Ana Alpha", "Zoe Zeta"], doctors.Select(d => d.FullName));
    }

    [Fact]
    public async Task Nurses_ReturnsActiveNurseRoleUsersOrderedByName()
    {
        await using var db = HmsDbContextTestFactory.Create();
        db.NurseProfiles.AddRange(
            CreateNurse("Zoe", "Zeta", roleName: "Nurse", isUserActive: true, isProfileActive: true),
            CreateNurse("Ana", "Alpha", roleName: "Nurse", isUserActive: true, isProfileActive: true),
            CreateNurse("Wrong", "Role", roleName: "Doctor", isUserActive: true, isProfileActive: true),
            CreateNurse("Inactive", "User", roleName: "Nurse", isUserActive: false, isProfileActive: true),
            CreateNurse("Inactive", "Profile", roleName: "Nurse", isUserActive: true, isProfileActive: false));
        await db.SaveChangesAsync();
        var controller = new NursesController(ServiceTestFactory.StaffDirectoryService(db));
        ControllerTestHelper.SetUser(controller, permissions: ["Nurses.Read"]);

        var result = await controller.GetNurses(CancellationToken.None);

        var nurses = ControllerTestHelper.AssertOkValue(result);
        Assert.Equal(["Ana Alpha", "Zoe Zeta"], nurses.Select(n => n.FullName));
    }

    private static DoctorProfile CreateDoctor(
        string firstName,
        string lastName,
        string roleName,
        bool isUserActive,
        bool isProfileActive)
    {
        return new DoctorProfile
        {
            IsActive = isProfileActive,
            LicenseNumber = $"D-{lastName}",
            StaffProfile = CreateStaff(firstName, lastName, roleName, isUserActive)
        };
    }

    private static NurseProfile CreateNurse(
        string firstName,
        string lastName,
        string roleName,
        bool isUserActive,
        bool isProfileActive)
    {
        return new NurseProfile
        {
            IsActive = isProfileActive,
            LicenseNumber = $"N-{lastName}",
            StaffProfile = CreateStaff(firstName, lastName, roleName, isUserActive)
        };
    }

    private static StaffProfile CreateStaff(string firstName, string lastName, string roleName, bool isUserActive)
    {
        var user = new User
        {
            UserName = $"{firstName}.{lastName}".ToLowerInvariant(),
            Email = $"{firstName}.{lastName}@example.test".ToLowerInvariant(),
            IsActive = isUserActive
        };
        user.UserRoles.Add(new UserRole
        {
            User = user,
            Role = new Role { Name = roleName },
            AssignedAt = DateTime.UtcNow
        });

        return new StaffProfile
        {
            Person = new Person
            {
                FirstName = firstName,
                LastName = lastName,
                User = user
            },
            StaffNumber = $"S-{lastName}"
        };
    }
}

