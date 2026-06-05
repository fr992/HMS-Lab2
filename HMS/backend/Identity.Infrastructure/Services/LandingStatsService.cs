using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class LandingStatsService : ILandingStatsService
{
    private readonly IHmsRepository _db;

    public LandingStatsService(IHmsRepository db)
    {
        _db = db;
    }

    public async Task<LandingStatsDto> GetAsync(CancellationToken cancellationToken)
    {
        return new LandingStatsDto
        {
            Patients = await _db.Query<PatientProfile>().CountAsync(cancellationToken),
            Staff = await _db.Query<StaffProfile>().CountAsync(cancellationToken),
            Doctors = await _db.Query<DoctorProfile>().CountAsync(doctor => doctor.IsActive, cancellationToken),
            Departments = await _db.Query<Department>().CountAsync(cancellationToken),
            Specialties = await _db.Query<Specialization>().CountAsync(cancellationToken),
            Appointments = await _db.Query<Appointment>().CountAsync(cancellationToken)
        };
    }
}
