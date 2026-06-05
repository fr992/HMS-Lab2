using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class PatientContactService : IPatientContactService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;

    public PatientContactService(IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;

        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<PatientContactDto>?> GetByPatientIdAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default)
    {
        if (!await _db.Query<PatientProfile>()
                .AsNoTracking()
                .AnyAsync(p => p.Id == patientProfileId, cancellationToken))
            return null;

        return await _db.Query<PatientContact>()
            .AsNoTracking()
            .Where(c => c.PatientProfileId == patientProfileId)
            .OrderBy(c => c.Id)
            .Select(c => new PatientContactDto
            {
                Name = c.Name,
                Relationship = c.Relationship,
                Phone = c.Phone,
                Email = c.Email,
                IsPrimary = c.IsPrimary
            })
            .ToListAsync(cancellationToken);
    }

    public async Task UpdateContactsAsync(
        int patientProfileId,
        IReadOnlyList<PatientContactDto> contacts,
        CancellationToken cancellationToken = default)
    {
        var patient = await _db.Query<PatientProfile>()
            .Include(p => p.Contacts)
            .FirstOrDefaultAsync(p => p.Id == patientProfileId, cancellationToken);

        if (patient is null)
            throw new NotFoundException("Patient not found.");

        if (contacts.Count(c => c.IsPrimary) > 1)
            throw new ConflictException("Only one primary contact is allowed.");

        _db.RemoveRange<PatientContact>(patient.Contacts);

        var newContacts = contacts.Select(c => new PatientContact
        {
            PatientProfileId = patientProfileId,
            Name = c.Name,
            Relationship = c.Relationship,
            Phone = c.Phone,
            Email = c.Email,
            IsPrimary = c.IsPrimary
        });

        await _db.AddRangeAsync<PatientContact>(newContacts, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
