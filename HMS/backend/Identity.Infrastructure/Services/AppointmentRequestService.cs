using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Identity.Infrastructure.Common;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net.Mail;
using System.Linq.Expressions;
using System.Text.RegularExpressions;

namespace Identity.Infrastructure.Services.Patients;

public sealed class AppointmentRequestService : IAppointmentRequestService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationService _notificationService;
    private readonly IAppointmentNotificationService _appointmentNotificationService;
    private readonly ILogger<AppointmentRequestService> _logger;

    public AppointmentRequestService(IHmsRepository db,
        IUnitOfWork unitOfWork,
        INotificationService notificationService,
        IAppointmentNotificationService appointmentNotificationService,
        ILogger<AppointmentRequestService> logger)
    {
        _db = db;
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
        _appointmentNotificationService = appointmentNotificationService;
        _logger = logger;
    }

    public async Task<AppointmentRequestDto> CreateAsync(
        CreateAppointmentRequestDto dto,
        CancellationToken ct)
    {
        var onlineRequestsEnabled = await _db.Query<Setting>()
            .AsNoTracking()
            .Where(setting => setting.Key == "appointments.allowOnlineRequests")
            .Select(setting => setting.Value)
            .FirstOrDefaultAsync(ct);

        if (string.Equals(onlineRequestsEnabled, "false", StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException("Online appointment requests are currently disabled.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        if (dto.PreferredDate < today)
            throw new BadRequestException("Preferred date must be today or in the future.");

        if (dto.DateOfBirth >= today)
            throw new BadRequestException("Date of birth is not valid.");

        EnsureContactDetailsAreValid(dto.Email, dto.Phone);

        if (dto.DoctorProfileId.HasValue)
            await EnsureDoctorExistsAsync(dto.DoctorProfileId.Value, ct);

        var now = DateTime.UtcNow;
        var entity = new AppointmentRequest
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email.Trim(),
            Phone = dto.Phone.Trim(),
            DateOfBirth = dto.DateOfBirth,
            PreferredDate = dto.PreferredDate,
            DoctorProfileId = dto.DoctorProfileId,
            ReasonForVisit = dto.ReasonForVisit.Trim(),
            Status = AppointmentRequestStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Add<AppointmentRequest>(entity);
        await _unitOfWork.SaveChangesAsync(ct);

        return await LoadByIdForManagerAsync(entity.Id, ct)
            ?? throw new Exception("Appointment request was created but could not be loaded.");
    }

    public async Task<PaginatedResponse<AppointmentRequestDto>> GetAllAsync(
        int actorUserId,
        IEnumerable<string> permissions,
        string? status,
        DateOnly? preferredDate,
        PaginationQuery pagination,
        CancellationToken ct)
    {
        var permissionSet = permissions as ISet<string> ?? permissions.ToHashSet(StringComparer.Ordinal);
        var query = _db.Query<AppointmentRequest>()
            .AsNoTracking()
            .AsQueryable();

        var canManageStatus = permissionSet.Contains("Appointments.ManageStatus");
        if (!canManageStatus)
        {
            var doctorProfileId = await ResolveDoctorProfileIdAsync(actorUserId, ct);
            if (!doctorProfileId.HasValue)
            {
                return PaginatedResponse<AppointmentRequestDto>.Create(
                    [],
                    pagination.Page,
                    pagination.PageSize,
                    0);
            }

            query = query.Where(a =>
                a.Status == AppointmentRequestStatus.Confirmed &&
                a.DoctorProfileId == doctorProfileId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var parsedStatus = ParseStatus(status);
            query = query.Where(a => a.Status == parsedStatus);
        }

        if (preferredDate.HasValue)
        {
            query = query.Where(a => a.PreferredDate == preferredDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(a =>
                a.FirstName.Contains(search) ||
                a.LastName.Contains(search) ||
                a.Email.Contains(search) ||
                a.Phone.Contains(search) ||
                a.ReasonForVisit.Contains(search));
        }

        return await query
            .OrderBy(a => a.Status == AppointmentRequestStatus.Pending ? 0 : 1)
            .ThenBy(a => a.PreferredDate)
            .ThenByDescending(a => a.CreatedAt)
            .Select(ToDto)
            .ToPaginatedResponseAsync(pagination, ct);
    }

    public async Task<AppointmentRequestDto?> GetByIdAsync(
        int id,
        int actorUserId,
        IEnumerable<string> permissions,
        CancellationToken ct)
    {
        var permissionSet = permissions as ISet<string> ?? permissions.ToHashSet(StringComparer.Ordinal);
        var query = _db.Query<AppointmentRequest>()
            .AsNoTracking()
            .Where(a => a.Id == id);

        var canManageStatus = permissionSet.Contains("Appointments.ManageStatus");
        if (!canManageStatus)
        {
            var doctorProfileId = await ResolveDoctorProfileIdAsync(actorUserId, ct);
            if (!doctorProfileId.HasValue)
                return null;

            query = query.Where(a =>
                a.Status == AppointmentRequestStatus.Confirmed &&
                a.DoctorProfileId == doctorProfileId.Value);
        }

        return await query
            .Select(ToDto)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<AppointmentRequestDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentRequestStatusDto dto,
        int? actorUserId,
        CancellationToken ct)
    {
        var entity = await _db.Query<AppointmentRequest>()
            .Include(a => a.Appointment)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (entity == null)
            throw new NotFoundException("Appointment request not found.");

        var nextStatus = ParseStatus(dto.Status);
        if (entity.Appointment != null)
            throw new ConflictException("This request already has a confirmed appointment. Manage the linked appointment instead.");

        if (entity.Status is not (AppointmentRequestStatus.Pending or AppointmentRequestStatus.Rescheduled))
            throw new ConflictException("Only pending or rescheduled online appointment requests can be changed.");

        if (nextStatus is not (AppointmentRequestStatus.Confirmed or AppointmentRequestStatus.Rescheduled or AppointmentRequestStatus.Cancelled))
            throw new BadRequestException("Online appointment requests can only be confirmed, rescheduled, or rejected.");

        if (nextStatus == AppointmentRequestStatus.Rescheduled && !dto.ScheduledStart.HasValue)
            throw new BadRequestException("Choose a new appointment date and time before rescheduling this request.");

        if (dto.ScheduledStart.HasValue && dto.ScheduledStart.Value <= DateTime.Now)
            throw new BadRequestException("Appointment date and time must be in the future.");

        var rejectionReason = string.IsNullOrWhiteSpace(dto.RejectionReason)
            ? null
            : dto.RejectionReason.Trim();
        if (rejectionReason?.Length > 500)
            throw new BadRequestException("Rejection reason cannot exceed 500 characters.");

        var changed = entity.Status != nextStatus || dto.ScheduledStart.HasValue || entity.RejectionReason != rejectionReason;
        if (dto.DoctorProfileId.HasValue && entity.DoctorProfileId != dto.DoctorProfileId)
        {
            await EnsureDoctorExistsAsync(dto.DoctorProfileId.Value, ct);
            entity.DoctorProfileId = dto.DoctorProfileId;
            changed = true;
        }

        if (nextStatus == AppointmentRequestStatus.Confirmed && !entity.DoctorProfileId.HasValue)
            throw new BadRequestException("Assign a doctor before confirming this appointment request.");

        if (nextStatus == AppointmentRequestStatus.Confirmed && !dto.ScheduledStart.HasValue && !entity.ProposedStart.HasValue)
            throw new BadRequestException("Choose an appointment date and time before confirming this request.");

        if (changed)
        {
            Appointment? appointment = null;
            bool? emailNotificationSent = null;
            if (dto.ScheduledStart.HasValue)
            {
                entity.ProposedStart = dto.ScheduledStart.Value;
                entity.PreferredDate = DateOnly.FromDateTime(dto.ScheduledStart.Value);
            }
            if (nextStatus == AppointmentRequestStatus.Confirmed)
                appointment = await CreateConfirmedAppointmentAsync(entity, entity.ProposedStart!.Value, actorUserId, ct);

            entity.Status = nextStatus;
            entity.RejectionReason = nextStatus == AppointmentRequestStatus.Cancelled ? rejectionReason : null;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedById = actorUserId;

            await _unitOfWork.SaveChangesAsync(ct);

            if (appointment != null)
            {
                await NotifyConfirmedAsync(entity, appointment, ct);
                emailNotificationSent = await NotifyExternalPatientAsync(entity, "Confirmed", appointment.ScheduledStart, null, ct);
            }
            else if (nextStatus == AppointmentRequestStatus.Cancelled)
            {
                await NotifyPatientAsync(
                    entity,
                    "Appointment request rejected",
                    rejectionReason == null
                        ? "Your online appointment request was rejected."
                        : $"Your online appointment request was rejected. Reason: {rejectionReason}",
                    ct);
                emailNotificationSent = await NotifyExternalPatientAsync(entity, "Rejected", entity.ProposedStart, rejectionReason, ct);
            }
            else if (nextStatus == AppointmentRequestStatus.Rescheduled)
            {
                await NotifyPatientAsync(entity, "Appointment request rescheduled", $"Your requested appointment time was changed to {entity.ProposedStart:g}.", ct);
                emailNotificationSent = await NotifyExternalPatientAsync(entity, "Rescheduled", entity.ProposedStart, null, ct);
            }

            var updated = await LoadByIdForManagerAsync(id, ct)
                ?? throw new Exception("Appointment request was updated but could not be loaded.");
            updated.EmailNotificationSent = emailNotificationSent;
            return updated;
        }

        return await LoadByIdForManagerAsync(id, ct)
            ?? throw new Exception("Appointment request was updated but could not be loaded.");
    }

    private async Task<Appointment> CreateConfirmedAppointmentAsync(
        AppointmentRequest request,
        DateTime scheduledStart,
        int? actorUserId,
        CancellationToken ct)
    {
        var durationValue = await _db.Query<Setting>()
            .AsNoTracking()
            .Where(setting => setting.Key == "appointments.defaultDurationMinutes")
            .Select(setting => setting.Value)
            .FirstOrDefaultAsync(ct);
        var durationMinutes = int.TryParse(durationValue, out var parsed) && parsed > 0 ? parsed : 30;
        var scheduledEnd = scheduledStart.AddMinutes(durationMinutes);

        var hasConflict = await _db.Query<Appointment>().AnyAsync(a =>
            a.DoctorProfileId == request.DoctorProfileId!.Value
            && a.Status != AppointmentStatus.Cancelled
            && scheduledStart < a.ScheduledEnd
            && scheduledEnd > a.ScheduledStart,
            ct);
        if (hasConflict)
            throw new ConflictException("Doctor has a conflicting appointment.");

        var patient = await _db.Query<PatientProfile>()
            .Include(p => p.Person)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(p =>
                p.Person.DateOfBirth.HasValue
                && DateOnly.FromDateTime(p.Person.DateOfBirth.Value) == request.DateOfBirth
                && (
                    (p.Person.User != null && p.Person.User.Email == request.Email)
                    || (p.Person.FirstName == request.FirstName
                        && p.Person.LastName == request.LastName
                        && p.Person.Phone == request.Phone)),
                ct);

        if (patient == null)
            patient = await CreateProvisionalPatientAsync(request, actorUserId, ct);

        var now = DateTime.UtcNow;
        var doctorProfileId = request.DoctorProfileId
            ?? throw new BadRequestException("Assign a doctor before confirming this appointment request.");
        var appointment = new Appointment
        {
            PatientProfileId = patient.Id,
            DoctorProfileId = doctorProfileId,
            DepartmentId = await _db.Query<DoctorProfile>()
                .Where(d => d.Id == doctorProfileId)
                .Select(d => d.StaffProfile.DepartmentId)
                .FirstOrDefaultAsync(ct),
            AppointmentRequestId = request.Id,
            ScheduledStart = scheduledStart,
            ScheduledEnd = scheduledEnd,
            Status = AppointmentStatus.Confirmed,
            AppointmentType = "online request",
            Reason = request.ReasonForVisit,
            ConfirmedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.Add<Appointment>(appointment);
        return appointment;
    }

    private async Task<PatientProfile> CreateProvisionalPatientAsync(
        AppointmentRequest request,
        int? actorUserId,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var person = new Person
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            DateOfBirth = request.DateOfBirth.ToDateTime(TimeOnly.MinValue),
            Phone = request.Phone,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };
        _db.Add<Person>(person);
        await _unitOfWork.SaveChangesAsync(ct);

        var patient = new PatientProfile
        {
            PersonId = person.Id,
            Person = person,
            PatientNumber = string.Empty,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };
        _db.Add<PatientProfile>(patient);
        await _unitOfWork.SaveChangesAsync(ct);

        patient.PatientNumber = $"PAT-{patient.Id:D5}";
        patient.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(ct);
        return patient;
    }

    private async Task NotifyConfirmedAsync(AppointmentRequest request, Appointment appointment, CancellationToken ct)
    {
        var patientUserId = await _db.Query<PatientProfile>()
            .Where(p => p.Id == appointment.PatientProfileId)
            .Select(p => p.Person.UserId)
            .FirstOrDefaultAsync(ct);
        var doctorUserId = await _db.Query<DoctorProfile>()
            .Where(d => d.Id == appointment.DoctorProfileId)
            .Select(d => d.StaffProfile.Person.UserId)
            .FirstOrDefaultAsync(ct);

        if (patientUserId.HasValue)
            await TryNotifyAsync(patientUserId.Value, "Appointment confirmed", $"Your appointment was confirmed for {appointment.ScheduledStart:g}.", appointment.Id, ct);
        if (doctorUserId.HasValue)
            await TryNotifyAsync(doctorUserId.Value, "Online appointment confirmed", $"{request.FirstName} {request.LastName} is scheduled for {appointment.ScheduledStart:g}.", appointment.Id, ct);
    }

    private async Task NotifyPatientAsync(AppointmentRequest request, string title, string message, CancellationToken ct)
    {
        var userId = await _db.Query<User>()
            .Where(user => user.Email == request.Email)
            .Select(user => (int?)user.Id)
            .FirstOrDefaultAsync(ct);
        if (userId.HasValue)
            await TryNotifyAsync(userId.Value, title, message, request.Appointment?.Id, ct);
    }

    private async Task<bool> NotifyExternalPatientAsync(
        AppointmentRequest request,
        string status,
        DateTime? scheduledStart,
        string? reason,
        CancellationToken ct)
    {
        try
        {
            var hospitalName = await _db.Query<Setting>()
                .AsNoTracking()
                .Where(setting => setting.Key == "hospital.name")
                .Select(setting => setting.Value)
                .FirstOrDefaultAsync(ct) ?? "Hospital";

            var doctor = request.DoctorProfileId.HasValue
                ? await _db.Query<DoctorProfile>()
                    .AsNoTracking()
                    .Where(d => d.Id == request.DoctorProfileId.Value)
                    .Select(d => new
                    {
                        Name = d.StaffProfile.Person.FullName,
                        DepartmentName = d.StaffProfile.Department != null ? d.StaffProfile.Department.Name : null
                    })
                    .FirstOrDefaultAsync(ct)
                : null;

            return await _appointmentNotificationService.NotifyAsync(
                new AppointmentNotification(
                    request.Id,
                    $"{request.FirstName} {request.LastName}".Trim(),
                    request.Email,
                    hospitalName,
                    status,
                    scheduledStart,
                    doctor?.Name,
                    doctor?.DepartmentName,
                    reason),
                ct);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Failed to send external notifications for online appointment request {AppointmentRequestId}.",
                request.Id);
            return false;
        }
    }

    private async Task TryNotifyAsync(int userId, string title, string message, int? appointmentId, CancellationToken ct)
    {
        try
        {
            await _notificationService.CreateAsync(new CreateNotificationRequestDto
            {
                UserId = userId,
                Type = "appointment",
                Title = title,
                Message = message,
                RelatedEntityType = appointmentId.HasValue ? "Appointment" : "AppointmentRequest",
                RelatedEntityId = (appointmentId ?? 0).ToString()
            }, ct);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "Failed to notify user {UserId} about online appointment request {RequestId}.", userId, appointmentId);
        }
    }

    private static AppointmentRequestStatus ParseStatus(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new BadRequestException("Appointment request status is required.");

        if (Enum.TryParse<AppointmentRequestStatus>(raw.Trim(), ignoreCase: true, out var status)
            && Enum.IsDefined(status))
        {
            return status;
        }

        throw new BadRequestException($"Unknown appointment request status: '{raw.Trim()}'.");
    }

    private async Task EnsureDoctorExistsAsync(int doctorProfileId, CancellationToken ct)
    {
        var exists = await _db.Query<DoctorProfile>().AnyAsync(
            d =>
                d.Id == doctorProfileId &&
                d.IsActive &&
                d.StaffProfile.Person.User != null &&
                d.StaffProfile.Person.User.IsActive,
            ct);

        if (!exists)
            throw new BadRequestException("Selected doctor is not available.");
    }

    private async Task<int?> ResolveDoctorProfileIdAsync(int userId, CancellationToken ct)
    {
        return await _db.Query<DoctorProfile>()
            .AsNoTracking()
            .Where(d =>
                d.IsActive &&
                d.StaffProfile.Person.UserId == userId &&
                d.StaffProfile.Person.User != null &&
                d.StaffProfile.Person.User.IsActive)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<AppointmentRequestDto?> LoadByIdForManagerAsync(int id, CancellationToken ct)
    {
        return await _db.Query<AppointmentRequest>()
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(ToDto)
            .FirstOrDefaultAsync(ct);
    }

    private static readonly Expression<Func<AppointmentRequest, AppointmentRequestDto>> ToDto = a =>
        new AppointmentRequestDto
        {
            Id = a.Id,
            FirstName = a.FirstName,
            LastName = a.LastName,
            Email = a.Email,
            Phone = a.Phone,
            DateOfBirth = a.DateOfBirth,
            PreferredDate = a.PreferredDate,
            DoctorProfileId = a.DoctorProfileId,
            DoctorName = a.DoctorProfile != null
                ? a.DoctorProfile.StaffProfile.Person.FullName
                : null,
            ReasonForVisit = a.ReasonForVisit,
            RejectionReason = a.RejectionReason,
            Status = a.Status.ToString(),
            AppointmentId = a.Appointment != null ? a.Appointment.Id : null,
            AppointmentStatus = a.Appointment != null ? a.Appointment.Status : null,
            ScheduledStart = a.Appointment != null ? a.Appointment.ScheduledStart : a.ProposedStart,
            ScheduledEnd = a.Appointment != null ? a.Appointment.ScheduledEnd : null,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };

    private static void EnsureContactDetailsAreValid(string email, string phone)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new BadRequestException("Email is required.");
        if (string.IsNullOrWhiteSpace(phone))
            throw new BadRequestException("Phone number is required.");

        try
        {
            _ = new MailAddress(email.Trim());
        }
        catch (FormatException)
        {
            throw new BadRequestException("Enter a valid email address.");
        }

        if (!Regex.IsMatch(phone.Trim(), @"^\+?[0-9][0-9\s().-]{5,28}[0-9]$"))
            throw new BadRequestException("Enter a valid phone number.");
    }
}
