using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Identity.Domain.Entities;

namespace Identity.Infrastructure.Services.Patients;

public sealed class PrescriptionService : IPrescriptionService
{
    private readonly HmsDbContext _db;

    public PrescriptionService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<PrescriptionDto> CreateAsync(
        CreatePrescriptionDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
            throw new InvalidOperationException("Prescription must contain at least one item.");

        var encounter = await _db.Encounters
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EncounterId, cancellationToken);

        if (encounter == null)
            throw new InvalidOperationException("Encounter does not exist.");

        if (encounter.Status != EncounterStatus.Open)
            throw new InvalidOperationException("Prescription can only be created for an open encounter.");

        var doctorExists = await _db.DoctorProfiles
            .AnyAsync(d => d.Id == request.PrescribedByDoctorId, cancellationToken);

        if (!doctorExists)
            throw new InvalidOperationException("Doctor profile does not exist.");

        if (encounter.DoctorProfileId != request.PrescribedByDoctorId)
            throw new InvalidOperationException("Prescription doctor must match the encounter doctor.");

        var medicationIds = request.Items
             .Select(i => i.MedicationId)
             .Distinct()
             .ToList();

         var existingMedicationIds = await _db.Medications
             .Where(m => medicationIds.Contains(m.Id))
             .Select(m => m.Id)
             .ToListAsync(cancellationToken);

         var missingMedicationIds = medicationIds
             .Except(existingMedicationIds)
             .ToList();

         if (missingMedicationIds.Count > 0)
             throw new InvalidOperationException("One or more medications do not exist.");

        foreach (var item in request.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Dosage))
                throw new InvalidOperationException("Dosage is required.");

            if (string.IsNullOrWhiteSpace(item.Frequency))
                throw new InvalidOperationException("Frequency is required.");

            if (string.IsNullOrWhiteSpace(item.Duration))
                throw new InvalidOperationException("Duration is required.");

            if (item.StartDate.HasValue && item.EndDate.HasValue && item.EndDate.Value < item.StartDate.Value)
                throw new InvalidOperationException("EndDate must be after StartDate.");

        }

        var now = DateTime.UtcNow;

        var prescription = new Prescription
        {
            EncounterId = request.EncounterId,
            PrescribedByDoctorId = request.PrescribedByDoctorId,
            Notes = request.Notes,
            Status = PrescriptionStatus.Active,

            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId,

            Items = request.Items.Select(i => new PrescriptionItem
            {
               MedicationId = i.MedicationId,
                Dosage = i.Dosage.Trim(),
                Unit = i.Unit?.Trim(),
                Frequency = i.Frequency.Trim(),
                Duration = i.Duration.Trim(),
                Route = i.Route?.Trim(),
                Instructions = i.Instructions?.Trim(),
                StartDate = i.StartDate,
                EndDate = i.EndDate,

                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = actorUserId,
                UpdatedById = actorUserId,
            }).ToList()
        };

        _db.Prescriptions.Add(prescription);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(prescription.Id, cancellationToken)
            ?? throw new InvalidOperationException("Prescription created but could not be loaded.");
    }

    public async Task<PrescriptionDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Prescriptions
            .AsNoTracking()
            .Include(p => p.PrescribedByDoctor)
                .ThenInclude(d => d.StaffProfile)
                    .ThenInclude(s => s.Person)
            .Include(p => p.Items)
               .ThenInclude(i => i.Medication)
            .Where(p => p.Id == id)
            .Select(p => new PrescriptionDto
            {
                Id = p.Id,
                EncounterId = p.EncounterId,
                PrescribedByDoctorId = p.PrescribedByDoctorId,
                DoctorName = p.PrescribedByDoctor.StaffProfile.Person.FullName,
                Notes = p.Notes,
                Status = p.Status,

                Items = p.Items.Select(i => new PrescriptionItemDto
                {
                    Id = i.Id,
                    MedicationId = i.MedicationId,
                    MedicationName = i.Medication.Name,
                    Dosage = i.Dosage,
                    Unit = i.Unit,
                    Frequency = i.Frequency,
                    Duration = i.Duration,
                    Route = i.Route,
                    Instructions = i.Instructions,
                    StartDate = i.StartDate,
                    EndDate = i.EndDate,
                }).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<PrescriptionDto>> GetPrescriptionsAsync(
        int? encounterId,
        int? patientProfileId,
        int? doctorProfileId,
        CancellationToken cancellationToken)
    {
        var query = _db.Prescriptions
            .AsNoTracking()
            .Include(p => p.Encounter)
            .Include(p => p.PrescribedByDoctor)
                .ThenInclude(d => d.StaffProfile)
                    .ThenInclude(s => s.Person)
            .Include(p => p.Items)
                .ThenInclude(i => i.Medication)
            .AsQueryable();

        if (encounterId.HasValue)
            query = query.Where(p => p.EncounterId == encounterId.Value);

        if (patientProfileId.HasValue)
            query = query.Where(p => p.Encounter.PatientProfileId == patientProfileId.Value);

        if (doctorProfileId.HasValue)
            query = query.Where(p => p.PrescribedByDoctorId == doctorProfileId.Value);

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PrescriptionDto
            {
                Id = p.Id,
                EncounterId = p.EncounterId,
                PrescribedByDoctorId = p.PrescribedByDoctorId,
                DoctorName = p.PrescribedByDoctor.StaffProfile.Person.FullName,
                Notes = p.Notes,
                Status = p.Status,

                Items = p.Items.Select(i => new PrescriptionItemDto
                {
                    Id = i.Id,
                    MedicationId = i.MedicationId,
                    MedicationName = i.Medication.Name,
                    Dosage = i.Dosage,
                    Unit = i.Unit,
                    Frequency = i.Frequency,
                    Duration = i.Duration,
                    Route = i.Route,
                    Instructions = i.Instructions,
                    StartDate = i.StartDate,
                    EndDate = i.EndDate,
                }).ToList()
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PrescriptionDto> UpdateStatusAsync(
        int id,
        UpdatePrescriptionStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var prescription = await _db.Prescriptions
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (prescription == null)
            throw new InvalidOperationException("Prescription not found.");

        if (!PrescriptionStatus.IsValid(request.Status))
            throw new InvalidOperationException("Invalid prescription status.");

        if (prescription.Status != PrescriptionStatus.Active)
            throw new InvalidOperationException("Only active prescriptions can change status.");

        if (request.Status == PrescriptionStatus.Active)
            throw new InvalidOperationException("Prescription is already active.");

        prescription.Status = request.Status;
        prescription.UpdatedAt = DateTime.UtcNow;
        prescription.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(prescription.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");


    }
}