using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using HMS.Persistence;
using Microsoft.EntityFrameworkCore;
using HMS.Domain.Entities;

namespace Identity.Infrastructure.Services;


public class PatientContactService
{
    private readonly HmsDbContext _db;

    public PatientContactService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task UpdateContactsAsync(int patientProfileId, List<PatientContactDto> contacts)
    {
        var patient = await _db.PatientProfiles
            .Include(p => p.Contacts)
            .FirstOrDefaultAsync(p => p.Id == patientProfileId);

        if (patient == null)
            throw new Exception("Patient not found");

        // VALIDATION
        if (contacts.Count(c => c.IsPrimary) > 1)
            throw new Exception("Only one primary contact allowed");

        // REMOVE OLD CONTACTS
        _db.PatientContacts.RemoveRange(patient.Contacts);

        // ADD NEW CONTACTS
        var newContacts = contacts.Select(c => new PatientContact
        {
            PatientProfileId = patientProfileId,
            Name = c.Name,
            Relationship = c.Relationship,
            Phone = c.Phone,
            Email = c.Email,
            IsPrimary = c.IsPrimary
        });

        await _db.PatientContacts.AddRangeAsync(newContacts);

        await _db.SaveChangesAsync();
    }
}