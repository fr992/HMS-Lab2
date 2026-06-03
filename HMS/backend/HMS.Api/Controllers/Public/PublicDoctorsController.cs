using HMS.Contracts.Identity;
using HMS.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/doctors")]
public sealed class PublicDoctorsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public PublicDoctorsController(HmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<DoctorProfileDto>>> GetDoctors(CancellationToken cancellationToken)
    {
        var list = await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d =>
                d.IsActive &&
                d.StaffProfile.Person.User != null &&
                d.StaffProfile.Person.User.IsActive &&
                d.StaffProfile.Person.User.UserRoles.Any(ur => ur.Role.Name == "Doctor"))
            .OrderBy(d => d.StaffProfile.Person.LastName)
            .ThenBy(d => d.StaffProfile.Person.FirstName)
            .Select(d => new DoctorProfileDto
            {
                Id = d.Id,
                StaffProfileId = d.StaffProfileId,
                UserId = d.StaffProfile.Person.UserId,
                PersonId = d.StaffProfile.Person.Id,
                FirstName = d.StaffProfile.Person.FirstName ?? string.Empty,
                LastName = d.StaffProfile.Person.LastName ?? string.Empty,
                FullName =
                    ((d.StaffProfile.Person.FirstName ?? string.Empty) + " " + (d.StaffProfile.Person.LastName ?? string.Empty)).Trim() != string.Empty
                        ? ((d.StaffProfile.Person.FirstName ?? string.Empty) + " " + (d.StaffProfile.Person.LastName ?? string.Empty)).Trim()
                        : (!string.IsNullOrWhiteSpace(d.LicenseNumber)
                            ? "Doctor " + d.LicenseNumber
                            : "Doctor #" + d.Id),
                Email = d.StaffProfile.Person.User != null ? d.StaffProfile.Person.User.Email : null,
                LicenseNumber = d.LicenseNumber,
                IsActive = d.IsActive,
                DepartmentId = d.StaffProfile.DepartmentId,
                DepartmentName = d.StaffProfile.Department != null ? d.StaffProfile.Department.Name : null,
                SpecializationId = d.SpecializationId,
                SpecializationName = d.Specialization != null ? d.Specialization.Name : null,
            })
            .ToListAsync(cancellationToken);

        return Ok(list);
    }
}
