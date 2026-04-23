using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;
using HMS.Domain.Entities;

namespace Identity.Infrastructure.Services.Patients;

    public sealed class PatientService : IPatientService
    {
        private readonly HmsDbContext _db;
        private readonly IPasswordHasher _passwordHasher; 
        public PatientService(HmsDbContext db, IPasswordHasher passwordHasher)
        {
            _db = db;
            _passwordHasher = passwordHasher;
        }

    public async Task<PatientProfileDto> RegisterAsync(
    RegisterPatientRequestDto request,
    CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // ALL validations inside transaction
            await ValidatePrimaryDoctorAsync(request.PrimaryDoctorId, cancellationToken);

            if (await _db.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
                throw new InvalidOperationException("A user with this email already exists.");

            if (await _db.Users.AnyAsync(u => u.UserName == request.UserName, cancellationToken))
                throw new InvalidOperationException("A patient with this username already exists.");

            if (!string.IsNullOrWhiteSpace(request.PersonalNumber))
            {
                if (await _db.People.AnyAsync(p => p.PersonalNumber == request.PersonalNumber, cancellationToken))
                    throw new InvalidOperationException("A person with this personal number already exists.");
            }

            var user = new User
            {
                UserName = request.UserName,
                Email = request.Email,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            user.PasswordHash = _passwordHasher.HashPassword(request.Password);
            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            var person = new Person
            {
                UserId = user.Id,
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
                UpdatedAt = DateTime.UtcNow
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
                UpdatedAt = DateTime.UtcNow
            };
            _db.PatientProfiles.Add(profile);
            await _db.SaveChangesAsync(cancellationToken);

            profile.PatientNumber = GeneratePatientNumber(profile.Id);
            profile.UpdatedAt = DateTime.UtcNow;
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

    public async Task<PatientProfileDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var exists = await _db.PatientProfiles.AnyAsync(p => p.Id == id, cancellationToken);
        if (!exists) return null;
        return await MapToDtoAsync(id, cancellationToken);
    }

    public async Task<PatientProfileDto> UpdateAsync(int id, UpdatePatientRequestDto request, CancellationToken cancellationToken)
    {
        var profile = await _db.PatientProfiles
            .Include(p => p.Person)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (profile is null)
            throw new InvalidOperationException("Patient not found.");

        if (request.PrimaryDoctorId.HasValue)
            await ValidatePrimaryDoctorAsync(request.PrimaryDoctorId, cancellationToken);

        // check for duplicate personal number if changing it
        if(!string.IsNullOrWhiteSpace(request.PersonalNumber) && 
            request.PersonalNumber != profile.Person.PersonalNumber)
        {
            var duplicate = await _db.People
                .AnyAsync(p => p.PersonalNumber == request.PersonalNumber && p.Id != profile.PersonId, cancellationToken);

            if (duplicate)
                throw new InvalidOperationException("A person with this personal number already exists.");
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

        // Update PAtientProfile fields
        if (request.InsuranceNumber is not null) profile.InsuranceNumber = request.InsuranceNumber;
        if (request.BloodType is not null) profile.BloodType = request.BloodType;
        if (request.PrimaryDoctorId.HasValue) profile.PrimaryDoctorId = request.PrimaryDoctorId;
        profile.UpdatedAt = DateTime.UtcNow;

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

    private async Task ValidatePrimaryDoctorAsync(int? primaryDoctorId, CancellationToken cancellationToken)
    {
        if (!primaryDoctorId.HasValue)
            return;

        var doctorExists = await _db.Set<DoctorProfile>()
            .AnyAsync(d => d.Id == primaryDoctorId.Value, cancellationToken);
        if (!doctorExists)
            throw new InvalidOperationException("Primary doctor does not exist.");
    }

    private async Task<PatientProfileDto> MapToDtoAsync(int profileId, CancellationToken cancellationToken)
    {
        return await _db.PatientProfiles
            .AsNoTracking()
            .Where(p => p.Id == profileId)
            .Select(p => new PatientProfileDto
            {
                Id = p.Id,
                PatientNumber = p.PatientNumber,
                InsuranceNumber = p.InsuranceNumber,
                BloodType = p.BloodType,
                PrimaryDoctorId = p.PrimaryDoctorId,
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
                UserId = p.Person.UserId!.Value,
                UserName = p.Person.User!.UserName,
                Email = p.Person.User!.Email,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .FirstAsync(cancellationToken);
    }

}
