using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class StaffDirectoryService : IStaffDirectoryService
{
    private readonly IHmsRepository _db;

    public StaffDirectoryService(IHmsRepository db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<DoctorProfileDto>> GetDoctorsAsync(
        string? search,
        int? limit,
        CancellationToken cancellationToken)
    {
        var take = limit.HasValue ? Math.Clamp(limit.Value, 1, 50) : (int?)null;
        var term = search?.Trim();
        var pattern = string.IsNullOrWhiteSpace(term) ? null : $"%{term}%";

        var query = _db.Query<DoctorProfile>()
            .Where(doctor =>
                doctor.IsActive &&
                doctor.StaffProfile.Person.User != null &&
                doctor.StaffProfile.Person.User.IsActive &&
                doctor.StaffProfile.Person.User.UserRoles.Any(userRole => userRole.Role.Name == "Doctor"));

        if (pattern is not null)
        {
            query = query.Where(doctor =>
                EF.Functions.Like(doctor.StaffProfile.Person.FirstName ?? string.Empty, pattern) ||
                EF.Functions.Like(doctor.StaffProfile.Person.LastName ?? string.Empty, pattern) ||
                EF.Functions.Like(
                    (doctor.StaffProfile.Person.FirstName ?? string.Empty) + " " + (doctor.StaffProfile.Person.LastName ?? string.Empty),
                    pattern) ||
                EF.Functions.Like(doctor.LicenseNumber ?? string.Empty, pattern) ||
                EF.Functions.Like(doctor.StaffProfile.Person.User!.Email ?? string.Empty, pattern) ||
                (doctor.StaffProfile.Department != null && EF.Functions.Like(doctor.StaffProfile.Department.Name, pattern)) ||
                (doctor.Specialization != null && EF.Functions.Like(doctor.Specialization.Name, pattern)));
        }

        query = query
            .OrderBy(doctor => doctor.StaffProfile.Person.LastName)
            .ThenBy(doctor => doctor.StaffProfile.Person.FirstName);

        if (take.HasValue)
            query = query.Take(take.Value);

        return await query
            .Select(doctor => new DoctorProfileDto
            {
                Id = doctor.Id,
                StaffProfileId = doctor.StaffProfileId,
                UserId = doctor.StaffProfile.Person.UserId,
                PersonId = doctor.StaffProfile.Person.Id,
                FirstName = doctor.StaffProfile.Person.FirstName ?? string.Empty,
                LastName = doctor.StaffProfile.Person.LastName ?? string.Empty,
                FullName =
                    ((doctor.StaffProfile.Person.FirstName ?? string.Empty) + " " + (doctor.StaffProfile.Person.LastName ?? string.Empty)).Trim() != string.Empty
                        ? ((doctor.StaffProfile.Person.FirstName ?? string.Empty) + " " + (doctor.StaffProfile.Person.LastName ?? string.Empty)).Trim()
                        : (!string.IsNullOrWhiteSpace(doctor.LicenseNumber)
                            ? "Doctor " + doctor.LicenseNumber
                            : "Doctor #" + doctor.Id),
                Email = doctor.StaffProfile.Person.User != null ? doctor.StaffProfile.Person.User.Email : null,
                LicenseNumber = doctor.LicenseNumber,
                IsActive = doctor.IsActive,
                DepartmentId = doctor.StaffProfile.DepartmentId,
                DepartmentName = doctor.StaffProfile.Department != null ? doctor.StaffProfile.Department.Name : null,
                SpecializationId = doctor.SpecializationId,
                SpecializationName = doctor.Specialization != null ? doctor.Specialization.Name : null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<NurseProfileDto>> GetNursesAsync(
        CancellationToken cancellationToken)
    {
        return await _db.Query<NurseProfile>()
            .Where(nurse =>
                nurse.IsActive &&
                nurse.StaffProfile.Person.User != null &&
                nurse.StaffProfile.Person.User.IsActive &&
                nurse.StaffProfile.Person.User.UserRoles.Any(userRole => userRole.Role.Name == "Nurse"))
            .OrderBy(nurse => nurse.StaffProfile.Person.LastName)
            .ThenBy(nurse => nurse.StaffProfile.Person.FirstName)
            .Select(nurse => new NurseProfileDto
            {
                Id = nurse.Id,
                StaffProfileId = nurse.StaffProfileId,
                UserId = nurse.StaffProfile.Person.UserId,
                PersonId = nurse.StaffProfile.Person.Id,
                FirstName = nurse.StaffProfile.Person.FirstName ?? string.Empty,
                LastName = nurse.StaffProfile.Person.LastName ?? string.Empty,
                FullName =
                    ((nurse.StaffProfile.Person.FirstName ?? string.Empty) + " " + (nurse.StaffProfile.Person.LastName ?? string.Empty)).Trim() != string.Empty
                        ? ((nurse.StaffProfile.Person.FirstName ?? string.Empty) + " " + (nurse.StaffProfile.Person.LastName ?? string.Empty)).Trim()
                        : (!string.IsNullOrWhiteSpace(nurse.LicenseNumber)
                            ? "Nurse " + nurse.LicenseNumber
                            : "Nurse #" + nurse.Id),
                Email = nurse.StaffProfile.Person.User != null ? nurse.StaffProfile.Person.User.Email : null,
                LicenseNumber = nurse.LicenseNumber,
                IsActive = nurse.IsActive,
                DepartmentId = nurse.StaffProfile.DepartmentId,
                DepartmentName = nurse.StaffProfile.Department != null ? nurse.StaffProfile.Department.Name : null
            })
            .ToListAsync(cancellationToken);
    }
}
