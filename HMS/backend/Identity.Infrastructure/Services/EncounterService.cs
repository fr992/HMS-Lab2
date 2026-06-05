using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Identity.Infrastructure.Common;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services.Patients;

public sealed class EncounterService : IEncounterService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;

    public EncounterService(IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;

        _unitOfWork = unitOfWork;
    }

    public async Task<EncounterDto> CreateAsync(
        CreateEncounterDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (!EncounterTypes.IsValid(request.EncounterType))
            throw new BadRequestException("Invalid encounter type.");

        var patientExists = await _db.Query<PatientProfile>().AnyAsync(
            p => p.Id == request.PatientProfileId,
            cancellationToken);

        if (!patientExists)
            throw new NotFoundException("Patient profile does not exist.");

        var doctorExists = await _db.Query<DoctorProfile>().AnyAsync(
            d => d.Id == request.DoctorProfileId,
            cancellationToken);

        if (!doctorExists)
            throw new NotFoundException("Doctor profile does not exist.");

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

        _db.Add<Encounter>(encounter);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new Exception("Encounter was created but could not be loaded.");
    }

    public async Task<EncounterDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Query<Encounter>()
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
                PatientName = e.PatientProfile.Person.FirstName + " " + e.PatientProfile.Person.LastName,

                DoctorProfileId = e.DoctorProfileId,
                DoctorName = e.DoctorProfile.StaffProfile.Person.FirstName + " " + e.DoctorProfile.StaffProfile.Person.LastName,
                DepartmentName = e.DoctorProfile.StaffProfile.Department != null
                    ? e.DoctorProfile.StaffProfile.Department.Name
                    : null,

                AppointmentId = e.AppointmentId,

                EncounterType = e.EncounterType,

                StartedAt = e.StartedAt,
                EndedAt = e.EndedAt,
                ClosedAt = e.ClosedAt,

                Status = e.Status,
                Notes = e.Notes,
                DiagnosesCount = _db.Query<Diagnosis>()
                    .Count(d => d.EncounterId == e.Id),
                PrescriptionsCount = _db.Query<Prescription>()
                    .Count(p => p.EncounterId == e.Id),
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<EncounterDto>> GetEncountersAsync(
        int? patientProfileId,
        int? doctorProfileId,
        string? search,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var query = await BuildEncountersQueryAsync(
            patientProfileId,
            doctorProfileId,
            search,
            actorUserId,
            actorRoles,
            cancellationToken);

        return await ProjectEncounterList(query)
            .ToListAsync(cancellationToken);
    }

    public async Task<PaginatedResponse<EncounterDto>> GetEncountersAsync(
        int? patientProfileId,
        int? doctorProfileId,
        string? search,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = await BuildEncountersQueryAsync(
            patientProfileId,
            doctorProfileId,
            search,
            actorUserId,
            actorRoles,
            cancellationToken);

        return await ProjectEncounterList(query)
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    private async Task<IQueryable<Encounter>> BuildEncountersQueryAsync(
        int? patientProfileId,
        int? doctorProfileId,
        string? search,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();
        var effectiveDoctorProfileId = await ResolveEffectiveDoctorProfileIdAsync(
            doctorProfileId,
            actorUserId,
            roleList,
            cancellationToken);

        var query = _db.Query<Encounter>().AsNoTracking().AsQueryable();

        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        if ((HasRole(roleList, "Admin") || HasRole(roleList, "SuperAdmin")) && normalizedSearch is null)
        {
            var recentThreshold = DateTime.UtcNow.AddDays(-30);
            query = query.Where(e => e.StartedAt >= recentThreshold);
        }

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

        if (normalizedSearch is not null)
        {
            query = query.Where(e =>
                e.EncounterNumber.Contains(normalizedSearch)
                || e.PatientProfile.Person.FirstName.Contains(normalizedSearch)
                || e.PatientProfile.Person.LastName.Contains(normalizedSearch)
                || e.DoctorProfile.StaffProfile.Person.FirstName.Contains(normalizedSearch)
                || e.DoctorProfile.StaffProfile.Person.LastName.Contains(normalizedSearch));
        }

        return query;
    }

    private IQueryable<EncounterDto> ProjectEncounterList(IQueryable<Encounter> query)
    {
        return query
            .OrderByDescending(e => e.StartedAt)
            .Select(e => new EncounterDto
            {
                Id = e.Id,
                EncounterNumber = e.EncounterNumber,

                PatientProfileId = e.PatientProfileId,
                PatientName = e.PatientProfile.Person.FirstName + " " + e.PatientProfile.Person.LastName,

                DoctorProfileId = e.DoctorProfileId,
                DoctorName = e.DoctorProfile.StaffProfile.Person.FirstName + " " + e.DoctorProfile.StaffProfile.Person.LastName,
                DepartmentName = e.DoctorProfile.StaffProfile.Department != null
                    ? e.DoctorProfile.StaffProfile.Department.Name
                    : null,

                AppointmentId = e.AppointmentId,

                EncounterType = e.EncounterType,

                StartedAt = e.StartedAt,
                EndedAt = e.EndedAt,
                ClosedAt = e.ClosedAt,

                Status = e.Status,
                Notes = e.Notes,
                DiagnosesCount = _db.Query<Diagnosis>()
                    .Count(d => d.EncounterId == e.Id),
                PrescriptionsCount = _db.Query<Prescription>()
                    .Count(p => p.EncounterId == e.Id),
            });
    }

    private async Task<int?> ResolveEffectiveDoctorProfileIdAsync(
        int? requestedDoctorProfileId,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        if (HasRole(roleList, "Admin") || HasRole(roleList, "SuperAdmin"))
            return requestedDoctorProfileId;

        if (!HasRole(roleList, "Doctor"))
            throw new ForbiddenException("Only admins and doctors can list encounters.");

        if (!actorUserId.HasValue)
            throw new UnauthorizedException("Authenticated user is required.");

        return await ResolveDoctorProfileIdAsync(actorUserId.Value, cancellationToken);
    }

    private async Task<int> ResolveDoctorProfileIdAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        var doctorProfileId = await _db.Query<DoctorProfile>()
            .AsNoTracking()
            .Where(d =>
                d.IsActive &&
                d.StaffProfile.Person.UserId == userId)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return doctorProfileId
            ?? throw new ForbiddenException("Current user is not linked to an active doctor profile.");
    }

    public async Task<EncounterDto> UpdateAsync(
        int id,
        UpdateEncounterDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var encounter = await _db.Query<Encounter>()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (encounter == null)
            throw new NotFoundException("Encounter not found.");

        EnsureEncounterEditable(encounter.Status);

        if (!EncounterTypes.IsValid(request.EncounterType))
            throw new BadRequestException("Invalid encounter type.");

        if (request.EndedAt.HasValue && request.EndedAt.Value <= request.StartedAt)
            throw new BadRequestException("EndedAt must be after StartedAt.");

        encounter.EncounterType = request.EncounterType;
        encounter.StartedAt = request.StartedAt;
        encounter.EndedAt = request.EndedAt;
        encounter.Notes = request.Notes;

        encounter.UpdatedAt = DateTime.UtcNow;
        encounter.UpdatedById = actorUserId;
        encounter.UpdatedByUserId = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new Exception("Encounter was updated but could not be loaded.");
    }

    public async Task<EncounterDto> UpdateStatusAsync(
        int id,
        UpdateEncounterStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var encounter = await _db.Query<Encounter>()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (encounter == null)
            throw new NotFoundException("Encounter not found.");

        if (!EncounterStatus.IsValid(request.Status))
            throw new BadRequestException("Invalid encounter status.");

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

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(encounter.Id, cancellationToken)
            ?? throw new Exception("Encounter was updated but could not be loaded.");
    }

    private async Task MarkLinkedAppointmentCompletedAsync(
        int appointmentId,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Query<Appointment>()
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

    public async Task<EncounterPanelDto?> GetPanelAsync(
        int id,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        await EnsureCanReadEncounterPanelAsync(
            id,
            actorUserId,
            actorRoles,
            cancellationToken);

        var panel = await _db.Query<Encounter>()
            .AsNoTracking()
            .Where(e => e.Id == id)
            .Select(e => new EncounterPanelDto
            {
                Encounter = new EncounterDto
                {
                    Id = e.Id,
                    EncounterNumber = e.EncounterNumber,
                    PatientProfileId = e.PatientProfileId,
                    PatientName = e.PatientProfile.Person.FirstName + " " + e.PatientProfile.Person.LastName,
                    DoctorProfileId = e.DoctorProfileId,
                    DoctorName = e.DoctorProfile.StaffProfile.Person.FirstName + " " + e.DoctorProfile.StaffProfile.Person.LastName,
                    DepartmentName = e.DoctorProfile.StaffProfile.Department != null
                        ? e.DoctorProfile.StaffProfile.Department.Name
                        : null,
                    AppointmentId = e.AppointmentId,
                    EncounterType = e.EncounterType,
                    StartedAt = e.StartedAt,
                    EndedAt = e.EndedAt,
                    ClosedAt = e.ClosedAt,
                    Status = e.Status,
                    Notes = e.Notes,
                    DiagnosesCount = _db.Query<Diagnosis>()
                        .Count(d => d.EncounterId == e.Id),
                    PrescriptionsCount = _db.Query<Prescription>()
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

                Diagnoses = _db.Query<Diagnosis>()
                    .AsNoTracking()
                    .Where(d => d.EncounterId == e.Id)
                    .Select(d => new DiagnosisDto
                    {
                        Id = d.Id,
                        EncounterId = d.EncounterId,
                        CreatedByDoctorId = d.CreatedByDoctorId,
                        CreatedByDoctorName = d.CreatedByDoctor.StaffProfile.Person.FirstName + " " + d.CreatedByDoctor.StaffProfile.Person.LastName,
                        IcdCode = d.IcdCode,
                        Description = d.Description,
                        Type = d.Type,
                        Notes = d.Notes,
                        DiagnosedAt = d.DiagnosedAt,
                        CreatedAt = d.CreatedAt,
                        UpdatedAt = d.UpdatedAt
                    })
                    .ToList(),

                Prescriptions = _db.Query<Prescription>()
                    .AsNoTracking()
                    .Where(p => p.EncounterId == e.Id)
                    .Select(p => new PrescriptionDto
                    {
                        Id = p.Id,
                        EncounterId = p.EncounterId,
                        PrescribedByDoctorId = p.PrescribedByDoctorId,
                        DoctorName = p.PrescribedByDoctor.StaffProfile.Person.FirstName + " " + p.PrescribedByDoctor.StaffProfile.Person.LastName,
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
                    }).ToList(),

                LabRequests = _db.Query<LabRequest>()
                    .AsNoTracking()
                    .Where(lr => lr.EncounterId == e.Id)
                    .OrderByDescending(lr => lr.RequestedAt)
                    .Select(lr => new LabRequestDto
                    {
                        Id = lr.Id,
                        RequestNumber = lr.RequestNumber,
                        EncounterId = lr.EncounterId,
                        PatientProfileId = lr.Encounter.PatientProfileId,
                        PatientName = lr.Encounter.PatientProfile.Person.FirstName + " " + lr.Encounter.PatientProfile.Person.LastName,
                        RequestedByDoctorId = lr.RequestedByDoctorId,
                        RequestedByDoctorName = lr.RequestedByDoctor.StaffProfile.Person.FirstName + " " + lr.RequestedByDoctor.StaffProfile.Person.LastName,
                        Priority = lr.Priority,
                        Status = lr.Status,
                        ClinicalNotes = lr.ClinicalNotes,
                        RequestedAt = lr.RequestedAt,
                        CollectedAt = lr.CollectedAt,
                        CompletedAt = lr.CompletedAt,
                        CreatedAt = lr.CreatedAt,
                        UpdatedAt = lr.UpdatedAt,
                        Items = lr.Items
                            .OrderBy(i => i.Id)
                            .Select(i => new LabRequestItemDto
                            {
                                Id = i.Id,
                                LabRequestId = i.LabRequestId,
                                LabTestId = i.LabTestId,
                                TestCode = i.LabTest.TestCode,
                                TestName = i.LabTest.Name,
                                SpecimenType = i.LabTest.SpecimenType,
                                Status = i.Status,
                                Notes = i.Notes,
                                Results = i.Results
                                    .OrderByDescending(r => r.CreatedAt)
                                    .ThenByDescending(r => r.Id)
                                    .Select(r => new LabResultDto
                                    {
                                        Id = r.Id,
                                        LabRequestItemId = r.LabRequestItemId,
                                        LabRequestId = r.LabRequestItem.LabRequestId,
                                        RequestNumber = r.LabRequestItem.LabRequest.RequestNumber,
                                        EncounterId = r.LabRequestItem.LabRequest.EncounterId,
                                        PatientProfileId = r.LabRequestItem.LabRequest.Encounter.PatientProfileId,
                                        PatientName = r.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.FirstName + " " + r.LabRequestItem.LabRequest.Encounter.PatientProfile.Person.LastName,
                                        TestName = r.LabRequestItem.LabTest.Name,
                                        TestCode = r.LabRequestItem.LabTest.TestCode,
                                        ResultData = r.ResultData,
                                        ReferenceRange = r.ReferenceRange,
                                        Interpretation = r.Interpretation,
                                        FileId = r.FileId,
                                        HasAttachment = r.FileId != null,
                                        AttachmentFileName = r.File != null ? r.File.OriginalFileName : null,
                                        AttachmentContentType = r.File != null ? r.File.ContentType : null,
                                        AttachmentSizeBytes = r.File != null ? r.File.SizeBytes : null,
                                        VerifiedByUserId = r.VerifiedByUserId,
                                        VerifiedByUserName = r.VerifiedByUser != null ? r.VerifiedByUser.UserName : null,
                                        VerifiedAt = r.VerifiedAt,
                                        CreatedAt = r.CreatedAt,
                                        UpdatedAt = r.UpdatedAt
                                    }).ToList()
                            }).ToList()
                    }).ToList(),

                BedAssignmentRequests = _db.Query<BedAssignmentRequest>()
                    .AsNoTracking()
                    .Where(br => br.EncounterId == e.Id)
                    .OrderByDescending(br => br.RequestedAt)
                    .Select(br => new BedAssignmentRequestDto
                    {
                        Id = br.Id,
                        EncounterId = br.EncounterId,
                        EncounterNumber = br.Encounter.EncounterNumber,
                        PatientProfileId = br.PatientProfileId,
                        PatientName = br.PatientProfile.Person.FirstName + " " + br.PatientProfile.Person.LastName,
                        PatientNumber = br.PatientProfile.PatientNumber,
                        RequestedByDoctorId = br.RequestedByDoctorId,
                        RequestedByDoctorName = br.RequestedByDoctor.StaffProfile.Person.FirstName + " " + br.RequestedByDoctor.StaffProfile.Person.LastName,
                        Status = br.Status,
                        Priority = br.Priority,
                        Notes = br.Notes,
                        PreferredWard = br.PreferredWard,
                        RequestedAt = br.RequestedAt,
                        ResolvedAt = br.ResolvedAt,
                        ResolvedByUserId = br.ResolvedByUserId,
                        BedAssignmentId = br.BedAssignmentId,
                        AssignedBedLabel = br.BedAssignment == null
                            ? null
                            : br.BedAssignment.Bed.Ward + " / " + br.BedAssignment.Bed.RoomNumber + " / " + br.BedAssignment.Bed.BedNumber,
                        CreatedByUserId = br.CreatedById,
                        CreatedByUserName = br.CreatedById == null
                            ? null
                            : _db.Query<User>()
                                .Where(u => u.Id == br.CreatedById.Value)
                                .Select(u => u.Person == null
                                    ? u.UserName
                                    : u.Person.FirstName + " " + u.Person.LastName)
                                .FirstOrDefault(),
                        CreatedAt = br.CreatedAt,
                        UpdatedAt = br.UpdatedAt
                    }).ToList()
            })
        .FirstOrDefaultAsync(cancellationToken);

        return panel;
    }

    private async Task EnsureCanReadEncounterPanelAsync(
        int encounterId,
        int? actorUserId,
        IEnumerable<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var roleList = actorRoles as IList<string> ?? actorRoles.ToList();

        if (HasRole(roleList, "Admin") || HasRole(roleList, "SuperAdmin"))
            return;

        if (!HasRole(roleList, "Doctor"))
            throw new ForbiddenException("Only admins and doctors can read encounter details.");

        if (!actorUserId.HasValue)
            throw new UnauthorizedException("Authenticated user is required.");

        var doctorProfileId = await ResolveDoctorProfileIdAsync(
            actorUserId.Value,
            cancellationToken);

        var allowed = await _db.Query<Encounter>()
            .AsNoTracking()
            .AnyAsync(
                e => e.Id == encounterId && e.DoctorProfileId == doctorProfileId,
                cancellationToken);

        if (!allowed)
            throw new ForbiddenException("Doctor can only access encounters assigned to them.");
    }

    public async Task<EncounterPanelDto?> GetPatientPanelAsync(
        int id,
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        if (currentUserId == null)
            return null;

        var allowed = await _db.Query<Encounter>()
            .AsNoTracking()
            .AnyAsync(e =>
                e.Id == id &&
                e.PatientProfile.Person.UserId == currentUserId.Value,
                cancellationToken);

        if (!allowed)
            return null;

        return await GetPanelProjectionAsync(id, cancellationToken);
    }

    private Task<EncounterPanelDto?> GetPanelProjectionAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return GetPanelAsync(
            id,
            actorUserId: null,
            actorRoles: ["Admin"],
            cancellationToken);
    }

    private static bool HasRole(IEnumerable<string> roles, string roleName)
    {
        return roles.Any(role => string.Equals(role, roleName, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<List<EncounterDto>> GetPatientEncountersAsync(
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        if (currentUserId == null)
            return new List<EncounterDto>();

        return await ProjectEncounterList(BuildPatientEncountersQuery(currentUserId.Value))
            .ToListAsync(cancellationToken);
    }

    public async Task<PaginatedResponse<EncounterDto>> GetPatientEncountersAsync(
        int? currentUserId,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        if (currentUserId == null)
            return PaginatedResponse<EncounterDto>.Create([], pagination.Page, pagination.PageSize, 0);

        return await ProjectEncounterList(BuildPatientEncountersQuery(currentUserId.Value))
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    private IQueryable<Encounter> BuildPatientEncountersQuery(int currentUserId)
    {
        return _db.Query<Encounter>()
            .AsNoTracking()
            .Where(e => e.PatientProfile.Person.UserId == currentUserId);
    }

    private async Task ValidateAppointmentLinkAsync(
        int appointmentId,
        int patientProfileId,
        int doctorProfileId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Query<Appointment>()
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == appointmentId, cancellationToken);

        if (appointment == null)
            throw new NotFoundException("Appointment does not exist.");

        if (appointment.PatientProfileId != patientProfileId)
            throw new BadRequestException("Appointment does not belong to this patient.");

        if (appointment.DoctorProfileId != doctorProfileId)
            throw new BadRequestException("Appointment does not belong to this doctor.");

        var encounterAlreadyExists = await _db.Query<Encounter>().AnyAsync(
            e => e.AppointmentId == appointmentId,
            cancellationToken);

        if (encounterAlreadyExists)
            throw new ConflictException("This appointment already has an encounter.");
    }

    private static void EnsureEncounterEditable(string currentStatus)
    {
        if (!string.Equals(currentStatus, EncounterStatus.Open, StringComparison.Ordinal))
        {
            throw new ConflictException("Only open encounters can be edited.");
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
                    throw new ConflictException("Only open encounters can be completed.");

                encounter.Status = EncounterStatus.Completed;
                encounter.EndedAt ??= now;
                encounter.ClosedAt = now;
                break;

            case EncounterStatus.Cancelled:
                if (!string.Equals(encounter.Status, EncounterStatus.Open, StringComparison.Ordinal))
                    throw new ConflictException("Only open encounters can be cancelled.");

                encounter.Status = EncounterStatus.Cancelled;
                encounter.ClosedAt = now;
                break;

            case EncounterStatus.Open:
                throw new BadRequestException("Cannot reopen an encounter from this endpoint.");

            default:
                throw new BadRequestException(
                    $"Unsupported target status '{targetStatus}'.");
        }
    }

    private static string GenerateEncounterNumber(DateTime now)
    {
        return $"ENC-{now:yyyyMMddHHmmssfff}";
    }
}
