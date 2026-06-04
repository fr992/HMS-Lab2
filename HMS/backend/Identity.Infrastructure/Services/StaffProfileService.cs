using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class StaffProfileService : IStaffProfileService
{
    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public StaffProfileService(HmsDbContext db, IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<(DoctorProfileDto? doctor, string? error)> CreateDoctorAsync(
        CreateDoctorStaffRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var validationError = await ValidateCommonAsync(
            request.UserName,
            request.Email,
            request.Password,
            request.FirstName,
            request.LastName,
            request.PersonalNumber,
            request.StaffNumber,
            request.DepartmentId,
            request.LicenseNumber,
            cancellationToken);

        if (validationError is not null)
            return (null, validationError);

        if (request.SpecializationId.HasValue &&
            !await _db.Set<Specialization>().AnyAsync(s => s.Id == request.SpecializationId.Value, cancellationToken))
        {
            return (null, "Specialization not found.");
        }

        if (await _db.DoctorProfiles.AnyAsync(d => d.LicenseNumber == request.LicenseNumber.Trim(), cancellationToken))
            return (null, "Doctor license number is already registered.");

        try
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<(DoctorProfileDto? doctor, string? error)>(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var user = await CreateUserAsync(
                        request.UserName,
                        request.Email,
                        request.Password,
                        request.IsActive,
                        "Doctor",
                        createdByUserId,
                        cancellationToken);

                    var staffProfile = await CreateStaffProfileAsync(
                        user.Id,
                        request.FirstName,
                        request.LastName,
                        request.PersonalNumber,
                        request.DateOfBirth,
                        request.Gender,
                        request.Phone,
                        request.Address,
                        request.City,
                        request.Country,
                        request.StaffNumber,
                        request.DepartmentId,
                        request.EmploymentStatus,
                        request.HireDate,
                        createdByUserId,
                        cancellationToken);

                    var now = DateTime.UtcNow;
                    var doctor = new DoctorProfile
                    {
                        StaffProfileId = staffProfile.Id,
                        SpecializationId = request.SpecializationId,
                        LicenseNumber = request.LicenseNumber.Trim(),
                        IsActive = request.IsActive,
                        CreatedAt = now,
                        UpdatedAt = now,
                        CreatedById = createdByUserId,
                        UpdatedById = createdByUserId
                    };

                    _db.DoctorProfiles.Add(doctor);
                    await _db.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    return (await MapDoctorAsync(doctor.Id, cancellationToken), null);
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            });
        }
        catch (Exception ex)
        {
            return (null, ToFriendlyCreateError(ex, "doctor"));
        }
    }

    public async Task<(NurseProfileDto? nurse, string? error)> CreateNurseAsync(
        CreateNurseStaffRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var validationError = await ValidateCommonAsync(
            request.UserName,
            request.Email,
            request.Password,
            request.FirstName,
            request.LastName,
            request.PersonalNumber,
            request.StaffNumber,
            request.DepartmentId,
            request.LicenseNumber,
            cancellationToken);

        if (validationError is not null)
            return (null, validationError);

        if (await _db.NurseProfiles.AnyAsync(n => n.LicenseNumber == request.LicenseNumber.Trim(), cancellationToken))
            return (null, "Nurse license number is already registered.");

        try
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<(NurseProfileDto? nurse, string? error)>(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var user = await CreateUserAsync(
                        request.UserName,
                        request.Email,
                        request.Password,
                        request.IsActive,
                        "Nurse",
                        createdByUserId,
                        cancellationToken);

                    var staffProfile = await CreateStaffProfileAsync(
                        user.Id,
                        request.FirstName,
                        request.LastName,
                        request.PersonalNumber,
                        request.DateOfBirth,
                        request.Gender,
                        request.Phone,
                        request.Address,
                        request.City,
                        request.Country,
                        request.StaffNumber,
                        request.DepartmentId,
                        request.EmploymentStatus,
                        request.HireDate,
                        createdByUserId,
                        cancellationToken);

                    var now = DateTime.UtcNow;
                    var nurse = new NurseProfile
                    {
                        StaffProfileId = staffProfile.Id,
                        LicenseNumber = request.LicenseNumber.Trim(),
                        IsActive = request.IsActive,
                        CreatedAt = now,
                        UpdatedAt = now,
                        CreatedById = createdByUserId,
                        UpdatedById = createdByUserId
                    };

                    _db.NurseProfiles.Add(nurse);
                    await _db.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    return (await MapNurseAsync(nurse.Id, cancellationToken), null);
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            });
        }
        catch (Exception ex)
        {
            return (null, ToFriendlyCreateError(ex, "nurse"));
        }
    }

    public async Task<(StaffProfileDto? staff, string? error)> CreateGeneralStaffAsync(
        CreateGeneralStaffRequestDto request,
        int? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var roleName = NormalizeGeneralStaffRole(request.RoleName);
        if (roleName is null)
            return (null, "Only Receptionist and Laboratorant staff can be created from this endpoint.");

        var validationError = await ValidateCommonAsync(
            request.UserName,
            request.Email,
            request.Password,
            request.FirstName,
            request.LastName,
            request.PersonalNumber,
            request.StaffNumber,
            request.DepartmentId,
            cancellationToken);

        if (validationError is not null)
            return (null, validationError);

        try
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<(StaffProfileDto? staff, string? error)>(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var user = await CreateUserAsync(
                        request.UserName,
                        request.Email,
                        request.Password,
                        request.IsActive,
                        roleName,
                        createdByUserId,
                        cancellationToken);

                    var staffProfile = await CreateStaffProfileAsync(
                        user.Id,
                        request.FirstName,
                        request.LastName,
                        request.PersonalNumber,
                        request.DateOfBirth,
                        request.Gender,
                        request.Phone,
                        request.Address,
                        request.City,
                        request.Country,
                        request.StaffNumber,
                        request.DepartmentId,
                        request.EmploymentStatus,
                        request.HireDate,
                        createdByUserId,
                        cancellationToken);

                    await transaction.CommitAsync(cancellationToken);

                    return (await MapStaffAsync(staffProfile.Id, roleName, request.IsActive, cancellationToken), null);
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            });
        }
        catch (Exception ex)
        {
            return (null, ToFriendlyCreateError(ex, "staff member"));
        }
    }

    private async Task<string?> ValidateCommonAsync(
        string userName,
        string email,
        string password,
        string firstName,
        string lastName,
        string? personalNumber,
        string staffNumber,
        int? departmentId,
        string licenseNumber,
        CancellationToken cancellationToken)
    {
        var validationError = await ValidateCommonAsync(
            userName,
            email,
            password,
            firstName,
            lastName,
            personalNumber,
            staffNumber,
            departmentId,
            cancellationToken);

        if (validationError is not null)
            return validationError;

        if (string.IsNullOrWhiteSpace(licenseNumber))
            return "License number is required.";

        return null;
    }

    private async Task<string?> ValidateCommonAsync(
        string userName,
        string email,
        string password,
        string firstName,
        string lastName,
        string? personalNumber,
        string staffNumber,
        int? departmentId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userName))
            return "UserName is required.";
        if (string.IsNullOrWhiteSpace(email))
            return "Email is required.";
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            return "Password must be at least 8 characters.";
        if (string.IsNullOrWhiteSpace(firstName))
            return "First name is required.";
        if (string.IsNullOrWhiteSpace(lastName))
            return "Last name is required.";
        if (string.IsNullOrWhiteSpace(staffNumber))
            return "Staff number is required.";

        var trimmedUserName = userName.Trim();
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var trimmedStaffNumber = staffNumber.Trim();

        if (await _db.Users.AnyAsync(u => u.UserName == trimmedUserName, cancellationToken))
            return "UserName is already taken.";
        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
            return "Email is already registered.";
        if (!string.IsNullOrWhiteSpace(personalNumber) &&
            await _db.People.AnyAsync(p => p.PersonalNumber == personalNumber.Trim(), cancellationToken))
        {
            return "A person with this personal number already exists.";
        }
        if (await _db.Set<StaffProfile>().AnyAsync(s => s.StaffNumber == trimmedStaffNumber, cancellationToken))
            return "Staff number is already registered.";
        if (departmentId.HasValue &&
            !await _db.Set<Department>().AnyAsync(d => d.Id == departmentId.Value, cancellationToken))
        {
            return "Department not found.";
        }

        return null;
    }

    private async Task<User> CreateUserAsync(
        string userName,
        string email,
        string password,
        bool isActive,
        string roleName,
        int? createdByUserId,
        CancellationToken cancellationToken)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken)
            ?? throw new InvalidOperationException($"{roleName} role not found in database.");

        var now = DateTime.UtcNow;
        var user = new User
        {
            UserName = userName.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            IsActive = isActive,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = createdByUserId,
            UpdatedById = createdByUserId
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        _db.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            AssignedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = createdByUserId,
            UpdatedById = createdByUserId
        });

        await _db.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task<StaffProfile> CreateStaffProfileAsync(
        int userId,
        string firstName,
        string lastName,
        string? personalNumber,
        DateTime? dateOfBirth,
        string? gender,
        string? phone,
        string? address,
        string? city,
        string? country,
        string staffNumber,
        int? departmentId,
        string employmentStatus,
        DateTime? hireDate,
        int? createdByUserId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var person = new Person
        {
            UserId = userId,
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            PersonalNumber = NormalizeOptional(personalNumber),
            DateOfBirth = dateOfBirth,
            Gender = NormalizeOptional(gender),
            Phone = NormalizeOptional(phone),
            Address = NormalizeOptional(address),
            City = NormalizeOptional(city),
            Country = NormalizeOptional(country),
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = createdByUserId,
            UpdatedById = createdByUserId
        };

        _db.People.Add(person);
        await _db.SaveChangesAsync(cancellationToken);

        var staffProfile = new StaffProfile
        {
            PersonId = person.Id,
            StaffNumber = staffNumber.Trim(),
            DepartmentId = departmentId,
            EmploymentStatus = string.IsNullOrWhiteSpace(employmentStatus) ? "Active" : employmentStatus.Trim(),
            HireDate = hireDate,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = createdByUserId,
            UpdatedById = createdByUserId
        };

        _db.Set<StaffProfile>().Add(staffProfile);
        await _db.SaveChangesAsync(cancellationToken);
        return staffProfile;
    }

    private async Task<DoctorProfileDto> MapDoctorAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new DoctorProfileDto
            {
                Id = d.Id,
                StaffProfileId = d.StaffProfileId,
                UserId = d.StaffProfile.Person.UserId,
                PersonId = d.StaffProfile.Person.Id,
                FirstName = d.StaffProfile.Person.FirstName,
                LastName = d.StaffProfile.Person.LastName,
                FullName = (d.StaffProfile.Person.FirstName + " " + d.StaffProfile.Person.LastName).Trim(),
                Email = d.StaffProfile.Person.User != null ? d.StaffProfile.Person.User.Email : null,
                LicenseNumber = d.LicenseNumber,
                IsActive = d.IsActive,
                DepartmentId = d.StaffProfile.DepartmentId,
                DepartmentName = d.StaffProfile.Department != null ? d.StaffProfile.Department.Name : null,
                SpecializationId = d.SpecializationId,
                SpecializationName = d.Specialization != null ? d.Specialization.Name : null
            })
            .SingleAsync(cancellationToken);
    }

    private async Task<NurseProfileDto> MapNurseAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.NurseProfiles
            .AsNoTracking()
            .Where(n => n.Id == id)
            .Select(n => new NurseProfileDto
            {
                Id = n.Id,
                StaffProfileId = n.StaffProfileId,
                UserId = n.StaffProfile.Person.UserId,
                PersonId = n.StaffProfile.Person.Id,
                FirstName = n.StaffProfile.Person.FirstName,
                LastName = n.StaffProfile.Person.LastName,
                FullName = (n.StaffProfile.Person.FirstName + " " + n.StaffProfile.Person.LastName).Trim(),
                Email = n.StaffProfile.Person.User != null ? n.StaffProfile.Person.User.Email : null,
                LicenseNumber = n.LicenseNumber,
                IsActive = n.IsActive,
                DepartmentId = n.StaffProfile.DepartmentId,
                DepartmentName = n.StaffProfile.Department != null ? n.StaffProfile.Department.Name : null
            })
            .SingleAsync(cancellationToken);
    }

    private async Task<StaffProfileDto> MapStaffAsync(
        int id,
        string roleName,
        bool isActive,
        CancellationToken cancellationToken)
    {
        return await _db.Set<StaffProfile>()
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new StaffProfileDto
            {
                Id = s.Id,
                UserId = s.Person.UserId,
                PersonId = s.Person.Id,
                FirstName = s.Person.FirstName,
                LastName = s.Person.LastName,
                FullName = (s.Person.FirstName + " " + s.Person.LastName).Trim(),
                Email = s.Person.User != null ? s.Person.User.Email : null,
                RoleName = roleName,
                StaffNumber = s.StaffNumber,
                IsActive = isActive,
                DepartmentId = s.DepartmentId,
                DepartmentName = s.Department != null ? s.Department.Name : null
            })
            .SingleAsync(cancellationToken);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeGeneralStaffRole(string? roleName)
    {
        var normalized = roleName?.Trim().Replace(" ", string.Empty).ToLowerInvariant();
        return normalized switch
        {
            "reception" or "receptionist" => "Receptionist",
            "lab" or "labstaff" or "laboratory" or "laboratorant" => "Laboratorant",
            _ => null
        };
    }

    private static string ToFriendlyCreateError(Exception exception, string staffType)
    {
        return exception is InvalidOperationException
            ? exception.Message
            : $"Could not create the {staffType}. Please review the information and try again.";
    }
}
