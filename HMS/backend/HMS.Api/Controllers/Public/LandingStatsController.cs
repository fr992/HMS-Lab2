using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/landing-stats")]
public sealed class LandingStatsController : ControllerBase
{
    private readonly HmsDbContext _db;

    public LandingStatsController(HmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<LandingStatsDto>> Get(CancellationToken cancellationToken)
    {
        var stats = new LandingStatsDto
        {
            Patients = await _db.PatientProfiles.AsNoTracking().CountAsync(cancellationToken),
            Staff = await _db.Set<StaffProfile>().AsNoTracking().CountAsync(cancellationToken),
            Doctors = await _db.DoctorProfiles.AsNoTracking().CountAsync(d => d.IsActive, cancellationToken),
            Departments = await _db.Set<Department>().AsNoTracking().CountAsync(cancellationToken),
            Specialties = await _db.Set<Specialization>().AsNoTracking().CountAsync(cancellationToken),
            Appointments = await _db.Appointments.AsNoTracking().CountAsync(cancellationToken),
        };

        return Ok(stats);
    }
}
