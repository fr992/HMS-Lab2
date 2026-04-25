using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class PatientContactService : IPatientContactService
{
    private readonly HmsDbContext _db;

    public PatientContactService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PatientContactDto>?> GetByPatientIdAsync(
        int patientProfileId,
        CancellationToken cancellationToken = default)
    {
        if (!await _db.PatientProfiles
                .AsNoTracking()
                .AnyAsync(p => p.Id == patientProfileId, cancellationToken))
            return null;

        return await _db.PatientContacts
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
        var patient = await _db.PatientProfiles
            .Include(p => p.Contacts)
            .FirstOrDefaultAsync(p => p.Id == patientProfileId, cancellationToken);

        if (patient is null)
            throw new InvalidOperationException("Patient not found.");

        if (contacts.Count(c => c.IsPrimary) > 1)
            throw new InvalidOperationException("Only one primary contact is allowed.");

        _db.PatientContacts.RemoveRange(patient.Contacts);

        var newContacts = contacts.Select(c => new PatientContact
        {
            PatientProfileId = patientProfileId,
            Name = c.Name,
            Relationship = c.Relationship,
            Phone = c.Phone,
            Email = c.Email,
            IsPrimary = c.IsPrimary
        });

        await _db.PatientContacts.AddRangeAsync(newContacts, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
