using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;


namespace Identity.Infrastructure.Services.Patients;

    public sealed class PatientService : IPatientService
    {
        private readonly HmsDbContext _db;
        private readonly IPasswordHasher<User> _passwordHasher;

        public PatientService(
            HmsDbContext db,
            IPasswordHasher<User> passwordHasher)
        {
            _db = db;
            _passwordHasher = passwordHasher;
        }

    public async Task<PatientProfileDto> RegisterAsync(
     RegisterPatientRequestDto request,
     int? actorUserId,
     CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // ALL validations inside transaction
            await ValidatePrimaryDoctorAsync(request.PrimaryDoctorId, cancellationToken);

            if (!string.IsNullOrWhiteSpace(request.PersonalNumber))
            {
                if (await _db.People.AnyAsync(p => p.PersonalNumber == request.PersonalNumber, cancellationToken))
                    throw new ConflictException("A person with this personal number already exists.");
            }

            // Omitted or null in JSON = default true (back compat with clients that do not send the flag).
            var withPortal = request.CreatePortalAccount ?? true;

            User? user = null;
            if (withPortal)
            {
                if (string.IsNullOrWhiteSpace(request.UserName))
                    throw new BadRequestException("Username is required when creating a portal account.");
                if (string.IsNullOrWhiteSpace(request.Email))
                    throw new BadRequestException("Email is required when creating a portal account.");
                if (string.IsNullOrWhiteSpace(request.Password))
                    throw new BadRequestException("Password is required when creating a portal account.");

                if (await _db.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
                    throw new ConflictException("A user with this email already exists.");

                if (await _db.Users.AnyAsync(u => u.UserName == request.UserName, cancellationToken))
                    throw new ConflictException("A patient with this username already exists.");

                user = new User
                {
                    UserName = request.UserName.Trim(),
                    Email = request.Email.Trim(),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedById = actorUserId,
                    UpdatedById = actorUserId
                };
                user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
                _db.Users.Add(user);
                await _db.SaveChangesAsync(cancellationToken);

                // Assign Patient role
                var patientRole = await _db.Roles
                    .FirstOrDefaultAsync(r => r.Name == "Patient", cancellationToken)
                    ?? throw new Exception("Patient role not found in database.");

                _db.UserRoles.Add(new UserRole
                {
                    UserId = user.Id,
                    RoleId = patientRole.Id,
                    CreatedAt = DateTime.UtcNow,
                    CreatedById = actorUserId
                });
                await _db.SaveChangesAsync(cancellationToken);
            }

            var person = new Person
            {
                UserId = user?.Id,
                FirstName = request.FirstName,
                LastName = request.LastName,
                PersonalNumber = request.PersonalNumber,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                Phone = request.Phone,
                Address = request.Address,
                City = request.City,
                Country = request.Country,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            };
            _db.People.Add(person);
            await _db.SaveChangesAsync(cancellationToken);

            var profile = new PatientProfile
            {
                PersonId = person.Id,
                PatientNumber = string.Empty,
                InsuranceNumber = request.InsuranceNumber,
                BloodType = request.BloodType,
                PrimaryDoctorId = request.PrimaryDoctorId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            };
            _db.PatientProfiles.Add(profile);
            await _db.SaveChangesAsync(cancellationToken);

            profile.PatientNumber = GeneratePatientNumber(profile.Id);
            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedById = actorUserId;
            await _db.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return await MapToDtoAsync(profile.Id, cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<PatientProfileDto> LinkPortalAccountAsync(
        int patientProfileId,
        LinkPatientPortalRequestDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var profile = await _db.PatientProfiles
                .Include(p => p.Person)
                .FirstOrDefaultAsync(p => p.Id == patientProfileId, cancellationToken);

            if (profile is null)
                throw new NotFoundException("Patient not found.");

            if (profile.Person.UserId != null)
                throw new ConflictException("This patient already has a portal account.");

            if (string.IsNullOrWhiteSpace(request.UserName))
                throw new BadRequestException("Username is required.");
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new BadRequestException("Email is required.");
            if (string.IsNullOrWhiteSpace(request.Password))
                throw new BadRequestException("Password is required.");

            var userName = request.UserName.Trim();
            var email = request.Email.Trim();

            if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
                throw new ConflictException("A user with this email already exists.");

            if (await _db.Users.AnyAsync(u => u.UserName == userName, cancellationToken))
                throw new ConflictException("A patient with this username already exists.");

            var patientRole = await _db.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Name == "Patient", cancellationToken);
            if (patientRole is null)
                throw new Exception("The Patient role is not configured in the system.");

            var user = new User
            {
                UserName = userName,
                Email = email,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            _db.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = patientRole.Id,
                AssignedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = actorUserId,
                UpdatedById = actorUserId
            });

            profile.Person.UserId = user.Id;
            profile.Person.UpdatedAt = DateTime.UtcNow;
            profile.Person.UpdatedById = actorUserId;

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return await MapToDtoAsync(patientProfileId, cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<PatientProfileDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var exists = await _db.PatientProfiles.AnyAsync(p => p.Id == id, cancellationToken);
        if (!exists) return null;
        return await MapToDtoAsync(id, cancellationToken);
    }

    public async Task<PatientProfileDto?> GetByIdForCurrentDoctorAsync(
        int currentUserId,
        int patientProfileId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (IsAdmin(actorRoles))
            return await GetByIdAsync(patientProfileId, cancellationToken);

        var doctorProfileId = await GetActiveDoctorProfileIdAsync(currentUserId, cancellationToken);
        var isLinkedPatient = await PatientIdsForDoctor(doctorProfileId)
            .AnyAsync(id => id == patientProfileId, cancellationToken);

        if (!isLinkedPatient)
            return null;

        return await MapToDtoAsync(patientProfileId, cancellationToken);
    }

    public async Task<List<PatientProfileDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _db.PatientProfiles
            .AsNoTracking()
            .Select(ProjectToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<List<PatientProfileDto>> GetForCurrentDoctorAsync(
        int currentUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (IsAdmin(actorRoles))
            return await GetAllPatientsOrderedAsync(cancellationToken);

        var doctorProfileId = await GetActiveDoctorProfileIdAsync(currentUserId, cancellationToken);
        var patientIds = PatientIdsForDoctor(doctorProfileId);

        return await _db.PatientProfiles
            .AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .OrderBy(p => p.Person.LastName)
            .ThenBy(p => p.Person.FirstName)
            .Select(ProjectToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<DoctorPatientsGroupedDto> GetGroupedForCurrentDoctorAsync(
        int currentUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (IsAdmin(actorRoles))
        {
            return new DoctorPatientsGroupedDto
            {
                PrimaryPatients = await GetAllPatientsOrderedAsync(cancellationToken),
                InteractedPatients = []
            };
        }

        var doctorProfileId = await GetActiveDoctorProfileIdAsync(currentUserId, cancellationToken);

        var primaryPatients = await _db.PatientProfiles
            .AsNoTracking()
            .Where(p => p.PrimaryDoctorId == doctorProfileId)
            .OrderBy(p => p.Person.LastName)
            .ThenBy(p => p.Person.FirstName)
            .Select(ProjectToDto())
            .ToListAsync(cancellationToken);

        var interactedPatientIds = _db.Appointments
            .Where(a => a.DoctorProfileId == doctorProfileId)
            .Select(a => a.PatientProfileId)
            .Concat(
                _db.Encounters
                    .Where(e => e.DoctorProfileId == doctorProfileId)
                    .Select(e => e.PatientProfileId)
            )
            .Distinct();

        var interactedPatients = await _db.PatientProfiles
            .AsNoTracking()
            .Where(p =>
                interactedPatientIds.Contains(p.Id)
                && p.PrimaryDoctorId != doctorProfileId)
            .OrderBy(p => p.Person.LastName)
            .ThenBy(p => p.Person.FirstName)
            .Select(ProjectToDto())
            .ToListAsync(cancellationToken);

        return new DoctorPatientsGroupedDto
        {
            PrimaryPatients = primaryPatients,
            InteractedPatients = interactedPatients
        };
    }

    public async Task<PatientProfileDto> UpdateAsync(int id, UpdatePatientRequestDto request, int? actorUserId, CancellationToken cancellationToken)
    {
        var profile = await _db.PatientProfiles
            .Include(p => p.Person)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (profile is null)
            throw new NotFoundException("Patient not found.");

        if (request.PrimaryDoctorId.HasValue)
            await ValidatePrimaryDoctorAsync(request.PrimaryDoctorId, cancellationToken);

        // check for duplicate personal number if changing it
        if(!string.IsNullOrWhiteSpace(request.PersonalNumber) && 
            request.PersonalNumber != profile.Person.PersonalNumber)
        {
            var duplicate = await _db.People
                .AnyAsync(p => p.PersonalNumber == request.PersonalNumber && p.Id != profile.PersonId, cancellationToken);

            if (duplicate)
                throw new ConflictException("A person with this personal number already exists.");
        }

        // Update person fields 
        if (request.FirstName is not null) profile.Person.FirstName = request.FirstName;
        if (request.LastName is not null) profile.Person.LastName = request.LastName;
        if (request.PersonalNumber is not null) profile.Person.PersonalNumber = request.PersonalNumber;
        if (request.DateOfBirth.HasValue) profile.Person.DateOfBirth = request.DateOfBirth;
        if (request.Gender is not null) profile.Person.Gender = request.Gender;
        if (request.Phone is not null) profile.Person.Phone = request.Phone;
        if (request.Address is not null) profile.Person.Address = request.Address;
        if (request.City is not null) profile.Person.City = request.City;
        if (request.Country is not null) profile.Person.Country = request.Country;
        profile.Person.UpdatedAt = DateTime.UtcNow;
        profile.Person.UpdatedById = actorUserId;

        // Update PAtientProfile fields
        if (request.InsuranceNumber is not null) profile.InsuranceNumber = request.InsuranceNumber;
        if (request.BloodType is not null) profile.BloodType = request.BloodType;
        if (request.PrimaryDoctorId.HasValue) profile.PrimaryDoctorId = request.PrimaryDoctorId;
        profile.UpdatedAt = DateTime.UtcNow;
        profile.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await MapToDtoAsync(profile.Id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var profile = await _db.PatientProfiles
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (profile is null) return false; 

        _db.PatientProfiles.Remove(profile);
        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string GeneratePatientNumber(int patientProfileId)
    {
        return $"PAT-{patientProfileId:D5}";
    }

    private async Task<int> GetActiveDoctorProfileIdAsync(
        int currentUserId,
        CancellationToken cancellationToken)
    {
        var doctorProfileId = await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d => d.IsActive && d.StaffProfile.Person.UserId == currentUserId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!doctorProfileId.HasValue)
            throw new ForbiddenException("Current user is not linked to an active doctor profile.");

        return doctorProfileId.Value;
    }

    private async Task<List<PatientProfileDto>> GetAllPatientsOrderedAsync(CancellationToken cancellationToken)
    {
        return await _db.PatientProfiles
            .AsNoTracking()
            .OrderBy(p => p.Person.LastName)
            .ThenBy(p => p.Person.FirstName)
            .Select(ProjectToDto())
            .ToListAsync(cancellationToken);
    }

    private static bool IsAdmin(IEnumerable<string> roles)
    {
        return roles.Any(role =>
            string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase));
    }

    private IQueryable<int> PatientIdsForDoctor(int doctorProfileId)
    {
        var primaryPatientIds = _db.PatientProfiles
            .Where(p => p.PrimaryDoctorId == doctorProfileId)
            .Select(p => p.Id);

        var appointmentPatientIds = _db.Appointments
            .Where(a => a.DoctorProfileId == doctorProfileId)
            .Select(a => a.PatientProfileId);

        var encounterPatientIds = _db.Encounters
            .Where(e => e.DoctorProfileId == doctorProfileId)
            .Select(e => e.PatientProfileId);

        return primaryPatientIds
            .Concat(appointmentPatientIds)
            .Concat(encounterPatientIds)
            .Distinct();
    }

    private async Task ValidatePrimaryDoctorAsync(int? primaryDoctorId, CancellationToken cancellationToken)
    {
        if (!primaryDoctorId.HasValue)
            return;

        var doctorExists = await _db.Set<DoctorProfile>()
            .AnyAsync(d => d.Id == primaryDoctorId.Value, cancellationToken);
        if (!doctorExists)
            throw new NotFoundException("Primary doctor does not exist.");
    }

    private async Task<PatientProfileDto> MapToDtoAsync(int profileId, CancellationToken cancellationToken)
    {
        return await _db.PatientProfiles
            .AsNoTracking()
            .Where(p => p.Id == profileId)
            .Select(ProjectToDto())
            .FirstAsync(cancellationToken);
    }

    private static Expression<Func<PatientProfile, PatientProfileDto>> ProjectToDto()
    {
        return p => new PatientProfileDto
        {
            Id = p.Id,
            PatientNumber = p.PatientNumber,
            InsuranceNumber = p.InsuranceNumber,
            BloodType = p.BloodType,
            PrimaryDoctorId = p.PrimaryDoctorId,
            PrimaryDoctorName = p.PrimaryDoctor == null
                ? null
                : p.PrimaryDoctor.StaffProfile.Person.FirstName + " " + p.PrimaryDoctor.StaffProfile.Person.LastName,
            PersonId = p.PersonId,
            FirstName = p.Person.FirstName,
            LastName = p.Person.LastName,
            PersonalNumber = p.Person.PersonalNumber,
            DateOfBirth = p.Person.DateOfBirth,
            Gender = p.Person.Gender,
            Phone = p.Person.Phone,
            Address = p.Person.Address,
            City = p.Person.City,
            Country = p.Person.Country,
            UserId = p.Person.UserId,
            UserName = p.Person.User != null ? p.Person.User.UserName : string.Empty,
            Email = p.Person.User != null ? p.Person.User.Email : string.Empty,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }

}
