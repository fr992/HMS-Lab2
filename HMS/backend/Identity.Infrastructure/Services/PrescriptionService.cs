using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Application.Exceptions;
using HMS.Application.Abstractions.Persistence;
using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Identity.Domain.Entities;

namespace Identity.Infrastructure.Services.Patients;

public sealed class PrescriptionService : IPrescriptionService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;

    public PrescriptionService(IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;

        _unitOfWork = unitOfWork;
    }

    public async Task<PrescriptionDto> CreateAsync(
        CreatePrescriptionDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
            throw new BadRequestException("Prescription must contain at least one item.");

        var encounter = await _db.Query<Encounter>()
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EncounterId, cancellationToken);

        if (encounter == null)
            throw new NotFoundException("Encounter does not exist.");

        if (encounter.Status != EncounterStatus.Open)
            throw new ConflictException("Prescription can only be created for an open encounter.");

        var doctorExists = await _db.Query<DoctorProfile>()
            .AnyAsync(d => d.Id == request.PrescribedByDoctorId, cancellationToken);

        if (!doctorExists)
            throw new NotFoundException("Doctor profile does not exist.");

        if (encounter.DoctorProfileId != request.PrescribedByDoctorId)
            throw new BadRequestException("Prescription doctor must match the encounter doctor.");

        var medicationIds = request.Items
             .Select(i => i.MedicationId)
             .Distinct()
             .ToList();

         var existingMedicationIds = await _db.Query<Medication>()
             .Where(m => medicationIds.Contains(m.Id))
             .Select(m => m.Id)
             .ToListAsync(cancellationToken);

         var missingMedicationIds = medicationIds
             .Except(existingMedicationIds)
             .ToList();

         if (missingMedicationIds.Count > 0)
             throw new NotFoundException("One or more medications do not exist.");

        foreach (var item in request.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Dosage))
                throw new BadRequestException("Dosage is required.");

            if (string.IsNullOrWhiteSpace(item.Frequency))
                throw new BadRequestException("Frequency is required.");

            if (string.IsNullOrWhiteSpace(item.Duration))
                throw new BadRequestException("Duration is required.");

            if (item.StartDate.HasValue && item.EndDate.HasValue && item.EndDate.Value < item.StartDate.Value)
                throw new BadRequestException("EndDate must be after StartDate.");

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

        _db.Add<Prescription>(prescription);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(prescription.Id, cancellationToken)
            ?? throw new Exception("Prescription was created but could not be loaded.");
    }

    public async Task<PrescriptionDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Query<Prescription>()
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
        var query = _db.Query<Prescription>()
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
        var prescription = await _db.Query<Prescription>()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (prescription == null)
            throw new NotFoundException("Prescription not found.");

        if (!PrescriptionStatus.IsValid(request.Status))
            throw new BadRequestException("Invalid prescription status.");

        if (prescription.Status != PrescriptionStatus.Active)
            throw new ConflictException("Only active prescriptions can change status.");

        if (request.Status == PrescriptionStatus.Active)
            throw new ConflictException("Prescription is already active.");

        prescription.Status = request.Status;
        prescription.UpdatedAt = DateTime.UtcNow;
        prescription.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(prescription.Id, cancellationToken)
            ?? throw new Exception("Prescription was updated but could not be loaded.");


    }
}
