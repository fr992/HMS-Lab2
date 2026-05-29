using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class UserProfileService : IUserProfileService
{
    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserProfileService(HmsDbContext db, IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<UserProfileDto> GetProfileInfoAsync(
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var user = await ProfileQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(entity => entity.Id == actorUserId, cancellationToken);

        return user is null
            ? throw new NotFoundException("User profile not found.")
            : MapToDto(user);
    }

    public async Task<UserProfileDto> UpdateProfileInfoAsync(
        int actorUserId,
        UserProfileUpdateDto request,
        CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .Include(entity => entity.Person)
            .FirstOrDefaultAsync(entity => entity.Id == actorUserId, cancellationToken);

        if (user is null)
            throw new NotFoundException("User profile not found.");

        var changed = false;

        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            if (string.IsNullOrWhiteSpace(name))
                throw new BadRequestException("Name cannot be empty.");

            if (user.Person is null)
                throw new BadRequestException("This user is not linked to a personal profile.");

            var (firstName, lastName) = SplitName(name);
            if (user.Person.FirstName != firstName || user.Person.LastName != lastName)
            {
                user.Person.FirstName = firstName;
                user.Person.LastName = lastName;
                user.Person.UpdatedAt = DateTime.UtcNow;
                user.Person.UpdatedById = actorUserId;
                changed = true;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            if (request.Password.Length < 8)
                throw new BadRequestException("Password must be at least 8 characters.");

            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            changed = true;
        }

        if (changed)
        {
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedById = actorUserId;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return await GetProfileInfoAsync(actorUserId, cancellationToken);
    }

    private IQueryable<User> ProfileQuery()
    {
        return _db.Users
            .AsSplitQuery()
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .Include(user => user.Person)
                .ThenInclude(person => person!.PatientProfile)
                .ThenInclude(patientProfile => patientProfile!.Contacts)
            .Include(user => user.Person)
                .ThenInclude(person => person!.PatientProfile)
                .ThenInclude(patientProfile => patientProfile!.PrimaryDoctor)
                .ThenInclude(doctorProfile => doctorProfile!.StaffProfile)
                .ThenInclude(staffProfile => staffProfile.Person)
            .Include(user => user.Person)
                .ThenInclude(person => person!.StaffProfile)
                .ThenInclude(staffProfile => staffProfile!.Department)
            .Include(user => user.Person)
                .ThenInclude(person => person!.StaffProfile)
                .ThenInclude(staffProfile => staffProfile!.DoctorProfile)
                .ThenInclude(doctorProfile => doctorProfile!.Specialization);
    }

    private static UserProfileDto MapToDto(User user)
    {
        var person = user.Person;
        var patientProfile = person?.PatientProfile;
        var staffProfile = person?.StaffProfile;
        var doctorProfile = staffProfile?.DoctorProfile;

        return new UserProfileDto
        {
            Name = DisplayName(user, person),
            Email = user.Email,
            Role = RoleLabel(user),
            PersonalNumber = person?.PersonalNumber,
            Gender = person?.Gender,
            PhoneNumber = person?.Phone,
            FullAddress = JoinNonEmpty(person?.Address, person?.City, person?.Country),
            DateOfBirth = person?.DateOfBirth,
            LastLoginAt = user.LastLoginAt,
            PatientId = patientProfile?.PatientNumber,
            InsuranceNumber = patientProfile?.InsuranceNumber,
            BloodType = patientProfile?.BloodType,
            PrimaryDoctor = DoctorName(patientProfile?.PrimaryDoctor),
            StaffNumber = staffProfile?.StaffNumber,
            EmploymentStatus = staffProfile?.EmploymentStatus,
            Department = staffProfile?.Department?.Name,
            LicenseNumber = doctorProfile?.LicenseNumber,
            Specialization = doctorProfile?.Specialization?.Name,
            Contacts = patientProfile?.Contacts
                .OrderByDescending(contact => contact.IsPrimary)
                .ThenBy(contact => contact.Name)
                .Select(contact => new PatientContactDto
                {
                    Name = contact.Name,
                    Relationship = contact.Relationship,
                    Phone = contact.Phone,
                    Email = contact.Email,
                    IsPrimary = contact.IsPrimary
                })
                .ToList() ?? []
        };
    }

    private static string DisplayName(User user, Person? person)
    {
        var name = JoinNonEmpty(person?.FirstName, person?.LastName);
        return string.IsNullOrWhiteSpace(name) ? user.UserName : name;
    }

    private static string? DoctorName(DoctorProfile? doctorProfile)
    {
        var person = doctorProfile?.StaffProfile.Person;
        var name = JoinNonEmpty(person?.FirstName, person?.LastName);
        return string.IsNullOrWhiteSpace(name) ? null : $"Dr. {name}";
    }

    private static string? RoleLabel(User user)
    {
        var roles = user.UserRoles
            .Select(userRole => userRole.Role.Name)
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .OrderBy(role => role)
            .ToArray();

        return roles.Length == 0 ? null : string.Join(", ", roles);
    }

    private static string JoinNonEmpty(params string?[] parts)
    {
        return string.Join(
            " ",
            parts
                .Select(part => part?.Trim())
                .Where(part => !string.IsNullOrWhiteSpace(part)));
    }

    private static (string FirstName, string LastName) SplitName(string name)
    {
        var parts = name.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        return (parts[0], parts.Length > 1 ? parts[1] : string.Empty);
    }
}
