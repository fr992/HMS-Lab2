using HMS.Api.Authorization;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/doctors")]
[Authorize]
public sealed class DoctorsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public DoctorsController(HmsDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Active doctor users for dropdowns (patient primary doctor, appointments, etc.).
    /// </summary>
    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<List<DoctorProfileDto>>> GetDoctors(
        CancellationToken cancellationToken,
        [FromQuery] string? search = null,
        [FromQuery] int? limit = null)
    {
        var take = limit.HasValue ? Math.Clamp(limit.Value, 1, 50) : (int?)null;
        var term = search?.Trim();
        var pattern = string.IsNullOrWhiteSpace(term) ? null : $"%{term}%";

        var query = _db.DoctorProfiles
            .AsNoTracking()
            .Where(d =>
                d.IsActive &&
                d.StaffProfile != null &&
                d.StaffProfile.Person != null &&
                d.StaffProfile.Person.User != null &&
                d.StaffProfile.Person.User.IsActive &&
                d.StaffProfile.Person.User.UserRoles.Any(ur => ur.Role.Name == "Doctor"));

        if (pattern is not null)
        {
            query = query.Where(d =>
                EF.Functions.Like(d.StaffProfile.Person.FirstName ?? string.Empty, pattern) ||
                EF.Functions.Like(d.StaffProfile.Person.LastName ?? string.Empty, pattern) ||
                EF.Functions.Like(((d.StaffProfile.Person.FirstName ?? string.Empty) + " " + (d.StaffProfile.Person.LastName ?? string.Empty)), pattern) ||
                EF.Functions.Like(d.LicenseNumber ?? string.Empty, pattern) ||
                EF.Functions.Like(d.StaffProfile.Person.User!.Email ?? string.Empty, pattern) ||
                (d.StaffProfile.Department != null && EF.Functions.Like(d.StaffProfile.Department.Name, pattern)) ||
                (d.Specialization != null && EF.Functions.Like(d.Specialization.Name, pattern)));
        }

        query = query
            .OrderBy(d => d.StaffProfile.Person.LastName)
            .ThenBy(d => d.StaffProfile.Person.FirstName);

        if (take.HasValue)
        {
            query = query.Take(take.Value);
        }

        var list = await query
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
