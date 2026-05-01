using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services.Patients;

public sealed class EncounterService : IEncounterService
{
    private readonly HmsDbContext _db;

    public EncounterService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<EncounterDto> CreateAsync(
        CreateEncounterDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (!EncounterTypes.IsValid(request.EncounterType))
            throw new InvalidOperationException("Invalid encounter type.");

        var patientExists = await _db.PatientProfiles.AnyAsync(
            p => p.Id == request.PatientProfileId,
            cancellationToken);

        if (!patientExists)
            throw new InvalidOperationException("Patient profile does not exist.");

        var doctorExists = await _db.DoctorProfiles.AnyAsync(
            d => d.Id == request.DoctorProfileId,
            cancellationToken);

        if (!doctorExists)
            throw new InvalidOperationException("Doctor profile does not exist.");

        if (request.AppointmentId.HasValue)
        {
            await ValidateAppointmentLinkAsync(
                request.AppointmentId.Value,
                request.PatientProfileId,
                request.DoctorProfileId,
                cancellationToken);
        }

        var now = DateTime.UtcNow;

        var encounter = new Encounter
        {
            EncounterNumber = GenerateEncounterNumber(now),

            PatientProfileId = request.PatientProfileId,
            DoctorProfileId = request.DoctorProfileId,
            AppointmentId = request.AppointmentId,

            EncounterType = request.EncounterType,
            StartedAt = request.StartedAt,

            Status = EncounterStatus.Open,
            Notes = request.Notes,

            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId,
            CreatedByUserId = actorUserId,
            UpdatedByUserId = actorUserId,
        };

        _db.Encounters.Add(encounter);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new InvalidOperationException("Encounter created but could not be loaded.");
    }

    public async Task<EncounterDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Encounters
            .AsNoTracking()
            .Include(e => e.PatientProfile)
                .ThenInclude(p => p.Person)
            .Include(e => e.DoctorProfile)
                .ThenInclude(d => d.StaffProfile)
                    .ThenInclude(s => s.Person)
            .Where(e => e.Id == id)
            .Select(e => new EncounterDto
            {
                Id = e.Id,
                EncounterNumber = e.EncounterNumber,

                PatientProfileId = e.PatientProfileId,
                PatientName = e.PatientProfile.Person.FullName,

                DoctorProfileId = e.DoctorProfileId,
                DoctorName = e.DoctorProfile.StaffProfile.Person.FullName,

                AppointmentId = e.AppointmentId,

                EncounterType = e.EncounterType,

                StartedAt = e.StartedAt,
                EndedAt = e.EndedAt,
                ClosedAt = e.ClosedAt,

                Status = e.Status,
                Notes = e.Notes,
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<EncounterDto>> GetEncountersAsync(
        int? patientProfileId,
        int? doctorProfileId,
        CancellationToken cancellationToken)
    {
        var query = _db.Encounters
            .AsNoTracking()
            .Include(e => e.PatientProfile)
                .ThenInclude(p => p.Person)
            .Include(e => e.DoctorProfile)
                .ThenInclude(d => d.StaffProfile)
                    .ThenInclude(s => s.Person)
            .AsQueryable();

        if (patientProfileId.HasValue)
        {
            query = query.Where(e =>
                e.PatientProfileId == patientProfileId.Value);
        }

        if (doctorProfileId.HasValue)
        {
            query = query.Where(e =>
                e.DoctorProfileId == doctorProfileId.Value);
        }

        return await query
            .OrderByDescending(e => e.StartedAt)
            .Select(e => new EncounterDto
            {
                Id = e.Id,
                EncounterNumber = e.EncounterNumber,

                PatientProfileId = e.PatientProfileId,
                PatientName = e.PatientProfile.Person.FullName,

                DoctorProfileId = e.DoctorProfileId,
                DoctorName = e.DoctorProfile.StaffProfile.Person.FullName,

                AppointmentId = e.AppointmentId,

                EncounterType = e.EncounterType,

                StartedAt = e.StartedAt,
                EndedAt = e.EndedAt,
                ClosedAt = e.ClosedAt,

                Status = e.Status,
                Notes = e.Notes,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<EncounterDto> UpdateAsync(
        int id,
        UpdateEncounterDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var encounter = await _db.Encounters
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (encounter == null)
            throw new InvalidOperationException("Encounter not found.");

        EnsureEncounterEditable(encounter.Status);

        if (!EncounterTypes.IsValid(request.EncounterType))
            throw new InvalidOperationException("Invalid encounter type.");

        if (request.EndedAt.HasValue && request.EndedAt.Value <= request.StartedAt)
            throw new InvalidOperationException("EndedAt must be after StartedAt.");

        encounter.EncounterType = request.EncounterType;
        encounter.StartedAt = request.StartedAt;
        encounter.EndedAt = request.EndedAt;
        encounter.Notes = request.Notes;

        encounter.UpdatedAt = DateTime.UtcNow;
        encounter.UpdatedById = actorUserId;
        encounter.UpdatedByUserId = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    public async Task<EncounterDto> UpdateStatusAsync(
        int id,
        UpdateEncounterStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var encounter = await _db.Encounters
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (encounter == null)
            throw new InvalidOperationException("Encounter not found.");

        if (!EncounterStatus.IsValid(request.Status))
            throw new InvalidOperationException("Invalid encounter status.");

        ApplyStatusTransition(encounter, request.Status);

        encounter.UpdatedAt = DateTime.UtcNow;
        encounter.UpdatedById = actorUserId;
        encounter.UpdatedByUserId = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    private async Task ValidateAppointmentLinkAsync(
        int appointmentId,
        int patientProfileId,
        int doctorProfileId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == appointmentId, cancellationToken);

        if (appointment == null)
            throw new InvalidOperationException("Appointment does not exist.");

        if (appointment.PatientProfileId != patientProfileId)
            throw new InvalidOperationException("Appointment does not belong to this patient.");

        if (appointment.DoctorProfileId != doctorProfileId)
            throw new InvalidOperationException("Appointment does not belong to this doctor.");

        var encounterAlreadyExists = await _db.Encounters.AnyAsync(
            e => e.AppointmentId == appointmentId,
            cancellationToken);

        if (encounterAlreadyExists)
            throw new InvalidOperationException("This appointment already has an encounter.");
    }

    private static void EnsureEncounterEditable(string currentStatus)
    {
        if (!string.Equals(currentStatus, EncounterStatus.Open, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Only open encounters can be edited.");
        }
    }

    private static void ApplyStatusTransition(
        Encounter encounter,
        string targetStatus)
    {
        var now = DateTime.UtcNow;

        switch (targetStatus)
        {
            case EncounterStatus.Completed:
                if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
                    throw new InvalidOperationException("Only open encounters can be completed.");

                encounter.Status = EncounterStatus.Completed;
                encounter.EndedAt ??= now;
                encounter.ClosedAt = now;
                break;

            case EncounterStatus.Cancelled:
                if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
                    throw new InvalidOperationException("Only open encounters can be cancelled.");

                encounter.Status = EncounterStatus.Cancelled;
                encounter.ClosedAt = now;
                break;

            case EncounterStatus.Open:
                throw new InvalidOperationException("Cannot reopen an encounter from this endpoint.");

            default:
                throw new InvalidOperationException(
                    $"Unsupported target status '{targetStatus}'.");
        }
    }

    private static string GenerateEncounterNumber(DateTime now)
    {
        return $"ENC-{now:yyyyMMddHHmmssfff}";
    }
}