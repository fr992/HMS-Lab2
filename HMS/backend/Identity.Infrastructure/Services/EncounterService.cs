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
                DiagnosesCount = _db.Diagnoses
                    .Count(d => d.EncounterId == e.Id),
                PrescriptionsCount = _db.Prescriptions
                    .Count(p => p.EncounterId == e.Id),
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<EncounterDto>> GetEncountersAsync(
        int? patientProfileId,
        int? doctorProfileId,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var effectiveDoctorProfileId = await ResolveEffectiveDoctorProfileIdAsync(
            doctorProfileId,
            actorUserId,
            actorRoles,
            cancellationToken);

        var query = _db.Encounters
            .AsNoTracking()
            .AsQueryable();

        if (patientProfileId.HasValue)
        {
            query = query.Where(e =>
                e.PatientProfileId == patientProfileId.Value);
        }

        if (effectiveDoctorProfileId.HasValue)
        {
            query = query.Where(e =>
                e.DoctorProfileId == effectiveDoctorProfileId.Value);
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
                DiagnosesCount = _db.Diagnoses
                    .Count(d => d.EncounterId == e.Id),
                PrescriptionsCount = _db.Prescriptions
                    .Count(p => p.EncounterId == e.Id),
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<int?> ResolveEffectiveDoctorProfileIdAsync(
        int? requestedDoctorProfileId,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        if (roleList.Any(role => string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)))
            return requestedDoctorProfileId;

        if (!roleList.Any(role => string.Equals(role, "Doctor", StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException("Only admins and doctors can list encounters.");

        if (!actorUserId.HasValue)
            throw new UnauthorizedAccessException("Authenticated user is required.");

        return await ResolveDoctorProfileIdAsync(actorUserId.Value, cancellationToken);
    }

    private async Task<int> ResolveDoctorProfileIdAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        var doctorProfileId = await _db.DoctorProfiles
            .AsNoTracking()
            .Where(d =>
                d.IsActive &&
                d.StaffProfile.Person.UserId == userId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return doctorProfileId
            ?? throw new InvalidOperationException("Current user is not linked to an active doctor profile.");
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

        if (string.Equals(request.Status, EncounterStatus.Completed, StringComparison.Ordinal)
            && encounter.AppointmentId.HasValue)
        {
            await MarkLinkedAppointmentCompletedAsync(
                encounter.AppointmentId.Value,
                actorUserId,
                cancellationToken);
        }

        encounter.UpdatedAt = DateTime.UtcNow;
        encounter.UpdatedById = actorUserId;
        encounter.UpdatedByUserId = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    private async Task MarkLinkedAppointmentCompletedAsync(
        int appointmentId,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId, cancellationToken);

        if (appointment == null)
            return;

        if (string.Equals(appointment.Status, AppointmentStatus.Completed, StringComparison.Ordinal))
            return;

        if (string.Equals(appointment.Status, AppointmentStatus.Cancelled, StringComparison.Ordinal)
            || string.Equals(appointment.Status, AppointmentStatus.NoShow, StringComparison.Ordinal))
            return;

        appointment.Status = AppointmentStatus.Completed;
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedById = actorUserId;
    }

    public async Task<EncounterPanelDto?> GetPanelAsync(int id, CancellationToken cancellationToken)
    {
        var panel = await _db.Encounters
            .AsNoTracking()
            .Where(e => e.Id == id)
            .Select(e => new EncounterPanelDto
            {
                Encounter = new EncounterDto
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
                    DiagnosesCount = _db.Diagnoses
                        .Count(d => d.EncounterId == e.Id),
                    PrescriptionsCount = _db.Prescriptions
                        .Count(p => p.EncounterId == e.Id)
                },
                Patient = new PatientProfileDto
                {
                    Id = e.PatientProfile.Id,
                    PatientNumber = e.PatientProfile.PatientNumber,
                    InsuranceNumber = e.PatientProfile.InsuranceNumber,
                    BloodType = e.PatientProfile.BloodType,
                    PrimaryDoctorId = e.PatientProfile.PrimaryDoctorId,

                    PersonId = e.PatientProfile.PersonId,
                    FirstName = e.PatientProfile.Person.FirstName,
                    LastName = e.PatientProfile.Person.LastName,
                    PersonalNumber = e.PatientProfile.Person.PersonalNumber,
                    DateOfBirth = e.PatientProfile.Person.DateOfBirth,
                    Gender = e.PatientProfile.Person.Gender,
                    Phone = e.PatientProfile.Person.Phone,
                    Address = e.PatientProfile.Person.Address,
                    City = e.PatientProfile.Person.City,
                    Country = e.PatientProfile.Person.Country,

                    UserId = e.PatientProfile.Person.UserId,
                    UserName = e.PatientProfile.Person.User != null
                        ? e.PatientProfile.Person.User.UserName
                        : string.Empty,
                    Email = e.PatientProfile.Person.User != null
                        ? e.PatientProfile.Person.User.Email
                        : string.Empty,

                    CreatedAt = e.PatientProfile.CreatedAt,
                    UpdatedAt = e.PatientProfile.UpdatedAt,
                },

                Diagnoses = _db.Diagnoses
                    .AsNoTracking()
                    .Where(d => d.EncounterId == e.Id)
                    .Select(d => new DiagnosisDto
                    {
                        Id = d.Id,
                        EncounterId = d.EncounterId,
                        CreatedByDoctorId = d.CreatedByDoctorId,
                        CreatedByDoctorName = d.CreatedByDoctor.StaffProfile.Person.FullName,
                        IcdCode = d.IcdCode,
                        Description = d.Description,
                        Type = d.Type,
                        Notes = d.Notes,
                        DiagnosedAt = d.DiagnosedAt,
                        CreatedAt = d.CreatedAt,
                        UpdatedAt = d.UpdatedAt
                    })
                    .ToList(),

                Prescriptions = _db.Prescriptions
                    .AsNoTracking()
                    .Where(p => p.EncounterId == e.Id)
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
                            Frequency = i.Frequency,
                            Duration = i.Duration,
                            Route = i.Route,
                            Instructions = i.Instructions, 
                        }).ToList()
                    }).ToList()
            })
        .FirstOrDefaultAsync(cancellationToken);

        return panel;
    }

    public async Task<EncounterPanelDto?> GetPatientPanelAsync(
        int id,
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        if (currentUserId == null)
            return null;

        var allowed = await _db.Encounters
            .AsNoTracking()
            .AnyAsync(e =>
                e.Id == id &&
                e.PatientProfile.Person.UserId == currentUserId.Value,
                cancellationToken);

        if (!allowed)
            return null;

        return await GetPanelAsync(id, cancellationToken);
    }

    public async Task<List<EncounterDto>> GetPatientEncountersAsync(
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        if (currentUserId == null)
            return new List<EncounterDto>();

        return await _db.Encounters
            .AsNoTracking()
            .Where(e => e.PatientProfile.Person.UserId == currentUserId.Value)
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
                DiagnosesCount = _db.Diagnoses
                    .Count(d => d.EncounterId == e.Id),
                PrescriptionsCount = _db.Prescriptions
                    .Count(p => p.EncounterId == e.Id)
            })
            .ToListAsync(cancellationToken);
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
