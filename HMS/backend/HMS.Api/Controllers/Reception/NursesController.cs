using HMS.Api.Authorization;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/nurses")]
[Authorize]
public sealed class NursesController : ControllerBase
{
    private readonly HmsDbContext _db;

    public NursesController(HmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [RequirePermission("Nurses.Read")]
    public async Task<ActionResult<List<NurseProfileDto>>> GetNurses(CancellationToken cancellationToken)
    {
        var list = await _db.NurseProfiles
            .AsNoTracking()
            .Where(n =>
                n.IsActive &&
                n.StaffProfile.Person.User != null &&
                n.StaffProfile.Person.User.IsActive &&
                n.StaffProfile.Person.User.UserRoles.Any(ur => ur.Role.Name == "Nurse" || ur.Role.Name == "Infermier"))
            .OrderBy(n => n.StaffProfile.Person.LastName)
            .ThenBy(n => n.StaffProfile.Person.FirstName)
            .Select(n => new NurseProfileDto
            {
                Id = n.Id,
                StaffProfileId = n.StaffProfileId,
                UserId = n.StaffProfile.Person.UserId,
                PersonId = n.StaffProfile.Person.Id,
                FirstName = n.StaffProfile.Person.FirstName ?? string.Empty,
                LastName = n.StaffProfile.Person.LastName ?? string.Empty,
                FullName =
                    ((n.StaffProfile.Person.FirstName ?? string.Empty) + " " + (n.StaffProfile.Person.LastName ?? string.Empty)).Trim() != string.Empty
                        ? ((n.StaffProfile.Person.FirstName ?? string.Empty) + " " + (n.StaffProfile.Person.LastName ?? string.Empty)).Trim()
                        : (!string.IsNullOrWhiteSpace(n.LicenseNumber)
                            ? "Nurse " + n.LicenseNumber
                            : "Nurse #" + n.Id),
                Email = n.StaffProfile.Person.User != null ? n.StaffProfile.Person.User.Email : null,
                LicenseNumber = n.LicenseNumber,
                IsActive = n.IsActive,
                DepartmentId = n.StaffProfile.DepartmentId,
                DepartmentName = n.StaffProfile.Department != null ? n.StaffProfile.Department.Name : null
            })
            .ToListAsync(cancellationToken);

        return Ok(list);
    }
}
