using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Globalization;

namespace Identity.Infrastructure.Services.Patients;

public sealed class AppointmentService : IAppointmentService
{
    private const int MinCancellationReasonLength = 3;

    private readonly IAppointmentRepository _appointments;
    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationService _notificationService;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(
        IAppointmentRepository appointments,
        IUnitOfWork unitOfWork,
        INotificationService notificationService,
        ILogger<AppointmentService> logger)
    {
        _appointments = appointments;
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<AppointmentDto> CreateAsync(
        CreateAppointmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var created = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            if (request.ScheduledEnd <= request.ScheduledStart)
                throw new BadRequestException("Scheduled end must be after scheduled start.");

            var patientExists = await _appointments.PatientExistsAsync(
                request.PatientProfileId,
                ct);

            if (!patientExists)
                throw new NotFoundException("Patient profile does not exist.");

            var doctorExists = await _appointments.DoctorExistsAsync(
                request.DoctorProfileId,
                ct);

            if (!doctorExists)
                throw new NotFoundException("Doctor profile does not exist.");

            await EnsureNoDoctorScheduleConflictAsync(
                request.DoctorProfileId,
                request.ScheduledStart,
                request.ScheduledEnd,
                excludeAppointmentId: null,
                ct);

            var appointment = new Appointment
            {
                PatientProfileId = request.PatientProfileId,
                DoctorProfileId = request.DoctorProfileId,
                DepartmentId = request.DepartmentId,

                ScheduledStart = request.ScheduledStart,
                ScheduledEnd = request.ScheduledEnd,

                Status = AppointmentStatus.Scheduled,
                AppointmentType = request.AppointmentType,
                Reason = request.Reason,

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedById = actorUserId,
                UpdatedById = actorUserId,
            };

            await _appointments.AddAsync(appointment, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return await GetByIdAsync(appointment.Id, ct)
                ?? throw new InvalidOperationException("Appointment was created but could not be loaded.");
        }, cancellationToken);

        await NotifyAppointmentCreatedAsync(created, cancellationToken);

        return created;
    }

    public async Task<AppointmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _appointments.Query()
            .Where(a => a.Id == id)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,

                PatientProfileId = a.PatientProfileId,
                PatientName = a.PatientProfile.Person.FullName,

                DoctorProfileId = a.DoctorProfileId,
                DoctorName = a.DoctorProfile.StaffProfile.Person.FullName,

                DepartmentId = a.DepartmentId,
                DepartmentName = a.Department != null ? a.Department.Name : null,

                ScheduledStart = a.ScheduledStart,
                ScheduledEnd = a.ScheduledEnd,

                Status = a.Encounter != null && a.Encounter.Status == EncounterStatus.Completed
                    ? AppointmentStatus.Completed
                    : a.Encounter != null && a.Encounter.Status == EncounterStatus.Open
                        ? AppointmentStatus.InProgress
                        : a.Status,
                IsOnlineRequest = a.AppointmentRequestId != null,
                AppointmentRequestId = a.AppointmentRequestId,
                EncounterId = a.Encounter != null ? a.Encounter.Id : null,
                EncounterStatus = a.Encounter != null ? a.Encounter.Status : null,
                AppointmentType = a.AppointmentType,
                Reason = a.Reason,
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AppointmentDto> UpdateAsync(
        int id,
        UpdateAppointmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await _appointments.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);
        if (appointment == null)
            throw new NotFoundException("Appointment not found.");

        if (appointment.AppointmentRequestId.HasValue)
            throw new ConflictException("Confirmed online appointments cannot be rescheduled from the internal appointment editor.");

        EnsureAppointmentEditable(appointment.Status);

        if (request.ScheduledEnd <= request.ScheduledStart)
            throw new BadRequestException("Scheduled end must be after start.");

        await EnsureNoDoctorScheduleConflictAsync(
            request.DoctorProfileId,
            request.ScheduledStart,
            request.ScheduledEnd,
            excludeAppointmentId: id,
            cancellationToken);

        appointment.ScheduledStart = request.ScheduledStart;
        appointment.ScheduledEnd = request.ScheduledEnd;
        appointment.DoctorProfileId = request.DoctorProfileId;
        appointment.DepartmentId = request.DepartmentId;
        appointment.AppointmentType = request.AppointmentType;
        appointment.Reason = request.Reason;

        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(appointment.Id, cancellationToken)
            ?? throw new Exception("Appointment was updated but could not be loaded.");
    }

    public async Task<AppointmentDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentStatusDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await _appointments.Query(asNoTracking: false)
            .Include(a => a.AppointmentRequest)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (appointment == null)
            throw new NotFoundException("Appointment not found.");

        var previousStatus = appointment.Status;
        var targetStatus = NormalizeAppointmentStatus(request.Status);

        EnsureStatusAllowedForAppointmentSource(appointment, targetStatus);
        EnsureAppointmentStatusTransition(appointment.Status, targetStatus);

        ApplyStatusTransition(appointment, targetStatus, request, actorUserId);
        if (targetStatus == AppointmentStatus.Cancelled && appointment.AppointmentRequest != null)
        {
            appointment.AppointmentRequest.Status = AppointmentRequestStatus.Cancelled;
            appointment.AppointmentRequest.UpdatedAt = DateTime.UtcNow;
            appointment.AppointmentRequest.UpdatedById = actorUserId;
        }

        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updated = await GetByIdAsync(id, cancellationToken)
            ?? throw new Exception("Appointment was updated but could not be loaded.");

        await NotifyPatientAppointmentStatusChangedAsync(previousStatus, updated, cancellationToken);

        return updated;
    }

    public async Task<PaginatedResponse<AppointmentDto>> GetAppointmentsAsync(
        int actorUserId,
        IEnumerable<string> permissions,
        DateTimeOffset? date,
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? status,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = _appointments.Query();

        var permissionSet = permissions as ISet<string> ?? permissions.ToHashSet(StringComparer.Ordinal);
        var canReadAll = permissionSet.Contains("Appointments.Read");
        var canReadOwn = permissionSet.Contains("Own.Appointments.View");

        if (canReadAll)
        {
            if (!permissionSet.Contains("Appointments.ManageStatus")
                && !permissionSet.Contains("Appointments.Create"))
            {
                var doctorProfileId = await _appointments.GetDoctorProfileIdByUserIdAsync(
                    actorUserId,
                    cancellationToken);
                if (doctorProfileId.HasValue)
                    query = query.Where(a => a.DoctorProfileId == doctorProfileId.Value);
            }
        }
        else if (canReadOwn)
        {
            query = query.Where(a =>
                a.PatientProfile.Person.UserId == actorUserId);
        }
        else
        {
            throw new ForbiddenException("No permission to view appointments.");
        }

        if (date.HasValue)
        {
            var day = date.Value.Date;
            var nextDay = day.AddDays(1);

            query = query.Where(a =>
                a.ScheduledStart >= day &&
                a.ScheduledStart < nextDay);
        }
        else
        {
            if (from.HasValue && to.HasValue && to.Value <= from.Value)
                throw new BadRequestException("End of date range must be after start.");

            if (from.HasValue)
            {
                var rangeStart = from.Value.UtcDateTime;
                query = query.Where(a => a.ScheduledStart >= rangeStart);
            }

            if (to.HasValue)
            {
                var rangeEnd = to.Value.UtcDateTime;
                query = query.Where(a => a.ScheduledStart < rangeEnd);
            }
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (string.Equals(status.Trim(), "upcoming", StringComparison.OrdinalIgnoreCase))
            {
                var now = DateTime.UtcNow;
                query = query.Where(a =>
                    a.ScheduledStart >= now &&
                    a.Encounter == null &&
                    (a.Status == AppointmentStatus.Scheduled || a.Status == AppointmentStatus.Confirmed));
            }
            else
            {
                var normalizedStatus = AppointmentStatus.NormalizeToKnownStatus(status);
                query = normalizedStatus switch
                {
                    AppointmentStatus.Completed => query.Where(a =>
                        a.Status == AppointmentStatus.Completed ||
                        (a.Encounter != null && a.Encounter.Status == EncounterStatus.Completed)),
                    AppointmentStatus.InProgress => query.Where(a =>
                        a.Status == AppointmentStatus.InProgress ||
                        (a.Encounter != null && a.Encounter.Status == EncounterStatus.Open)),
                    _ => query.Where(a =>
                        a.Status == normalizedStatus &&
                        (a.Encounter == null ||
                         (a.Encounter.Status != EncounterStatus.Open &&
                          a.Encounter.Status != EncounterStatus.Completed)))
                };
            }
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(a =>
                a.PatientProfile.Person.FirstName.Contains(search) ||
                a.PatientProfile.Person.LastName.Contains(search) ||
                a.DoctorProfile.StaffProfile.Person.FirstName.Contains(search) ||
                a.DoctorProfile.StaffProfile.Person.LastName.Contains(search) ||
                (a.Department != null && a.Department.Name.Contains(search)) ||
                (a.AppointmentType != null && a.AppointmentType.Contains(search)) ||
                (a.Reason != null && a.Reason.Contains(search)) ||
                a.Status.Contains(search));
        }

        var page = pagination.Page;
        var pageSize = pagination.PageSize;
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(a => a.ScheduledStart)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                PatientProfileId = a.PatientProfileId,
                PatientName = a.PatientProfile.Person.FullName,
                DoctorProfileId = a.DoctorProfileId,
                DoctorName = a.DoctorProfile.StaffProfile.Person.FullName,
                DepartmentId = a.DepartmentId,
                DepartmentName = a.Department != null ? a.Department.Name : null,
                ScheduledStart = a.ScheduledStart,
                ScheduledEnd = a.ScheduledEnd,
                Status = a.Encounter != null && a.Encounter.Status == EncounterStatus.Completed
                    ? AppointmentStatus.Completed
                    : a.Encounter != null && a.Encounter.Status == EncounterStatus.Open
                        ? AppointmentStatus.InProgress
                        : a.Status,
                IsOnlineRequest = a.AppointmentRequestId != null,
                AppointmentRequestId = a.AppointmentRequestId,
                EncounterId = a.Encounter != null ? a.Encounter.Id : null,
                EncounterStatus = a.Encounter != null ? a.Encounter.Status : null,
                AppointmentType = a.AppointmentType,
                Reason = a.Reason,
            })
            .ToListAsync(cancellationToken);

        return PaginatedResponse<AppointmentDto>.Create(items, page, pageSize, totalCount);
    }

    private static void EnsureAppointmentEditable(string currentStatus)
    {
        if (string.Equals(currentStatus, AppointmentStatus.Completed, StringComparison.Ordinal)
            || string.Equals(currentStatus, AppointmentStatus.Cancelled, StringComparison.Ordinal)
            || string.Equals(currentStatus, AppointmentStatus.NoShow, StringComparison.Ordinal))
        {
            throw new ConflictException(
                "This appointment can no longer be edited.");
        }
    }

    private static void ApplyStatusTransition(
        Appointment appointment,
        string targetStatus,
        UpdateAppointmentStatusDto request,
        int? actorUserId)
    {
        switch (targetStatus)
        {
            case AppointmentStatus.Confirmed:
                appointment.Status = AppointmentStatus.Confirmed;
                appointment.ConfirmedAt ??= DateTime.UtcNow;
                break;

            case AppointmentStatus.CheckedIn:
                appointment.Status = AppointmentStatus.CheckedIn;
                appointment.CheckedInAt = DateTime.UtcNow;
                break;

            case AppointmentStatus.InProgress:
                appointment.Status = AppointmentStatus.InProgress;
                break;

            case AppointmentStatus.Cancelled:
                var reason = request.CancellationReason?.Trim() ?? string.Empty;
                if (reason.Length < MinCancellationReasonLength)
                {
                    throw new BadRequestException(
                        $"Cancellation reason must be at least {MinCancellationReasonLength} characters.");
                }

                appointment.Status = AppointmentStatus.Cancelled;
                appointment.CancellationReason = reason;
                appointment.CancelledAt = DateTime.UtcNow;
                appointment.CancelledByUserId = actorUserId;
                break;

            case AppointmentStatus.Completed:
                appointment.Status = AppointmentStatus.Completed;
                break;

            case AppointmentStatus.NoShow:
                appointment.Status = AppointmentStatus.NoShow;
                break;

            default:
                throw new BadRequestException(
                    $"Unsupported target status '{targetStatus}'.");
        }
    }

    private async Task EnsureNoDoctorScheduleConflictAsync(
        int doctorProfileId,
        DateTime scheduledStart,
        DateTime scheduledEnd,
        int? excludeAppointmentId,
        CancellationToken cancellationToken)
    {
        var hasConflict = await _appointments.HasDoctorScheduleConflictAsync(
            doctorProfileId,
            scheduledStart,
            scheduledEnd,
            excludeAppointmentId,
            cancellationToken);

        if (hasConflict)
            throw new ConflictException("Doctor has a conflicting appointment.");
    }

    private static string NormalizeAppointmentStatus(string raw)
    {
        try
        {
            return AppointmentStatus.NormalizeToKnownStatus(raw);
        }
        catch (InvalidOperationException exception)
        {
            throw new BadRequestException(exception.Message);
        }
    }

    private static void EnsureAppointmentStatusTransition(string currentStatus, string targetStatus)
    {
        try
        {
            AppointmentStatus.EnsureCanTransition(currentStatus, targetStatus);
        }
        catch (InvalidOperationException exception)
        {
            throw new ConflictException(exception.Message);
        }
    }

    private static void EnsureStatusAllowedForAppointmentSource(Appointment appointment, string targetStatus)
    {
        if (appointment.AppointmentRequestId.HasValue)
        {
            if (targetStatus is AppointmentStatus.Completed or AppointmentStatus.InProgress)
                throw new ForbiddenException("Online appointments can only be completed or started through the assigned doctor's encounter workflow.");
            return;
        }

        if (targetStatus is AppointmentStatus.CheckedIn or AppointmentStatus.InProgress)
            throw new ConflictException("Check-in and in-progress statuses apply only to online appointment requests.");
    }

    private async Task NotifyAppointmentCreatedAsync(
        AppointmentDto appointment,
        CancellationToken cancellationToken)
    {
        var scheduledAt = FormatNotificationDateTime(appointment.ScheduledStart);
        var patientUserId = await _appointments.GetPatientUserIdAsync(
            appointment.PatientProfileId,
            cancellationToken);

        var doctorUserId = await _appointments.GetDoctorUserIdAsync(
            appointment.DoctorProfileId,
            cancellationToken);

        if (patientUserId.HasValue)
        {
            await TryCreateNotificationAsync(
                new CreateNotificationRequestDto
                {
                    UserId = patientUserId.Value,
                    Type = "appointment",
                    Title = "Appointment scheduled",
                    Message = $"Your appointment with {appointment.DoctorName} is scheduled for {scheduledAt}.",
                    RelatedEntityType = "Appointment",
                    RelatedEntityId = appointment.Id.ToString()
                },
                cancellationToken);
        }

        if (doctorUserId.HasValue)
        {
            await TryCreateNotificationAsync(
                new CreateNotificationRequestDto
                {
                    UserId = doctorUserId.Value,
                    Type = "appointment",
                    Title = "New appointment assigned",
                    Message = $"New appointment with {appointment.PatientName} scheduled for {scheduledAt}.",
                    RelatedEntityType = "Appointment",
                    RelatedEntityId = appointment.Id.ToString()
                },
                cancellationToken);
        }
    }

    private static string FormatNotificationDateTime(DateTime value)
    {
        var localTime = value.Kind switch
        {
            DateTimeKind.Local => value,
            DateTimeKind.Utc => value.ToLocalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc).ToLocalTime()
        };

        return localTime.ToString("MMM d, yyyy HH:mm", CultureInfo.InvariantCulture);
    }

    private async Task NotifyPatientAppointmentStatusChangedAsync(
        string previousStatus,
        AppointmentDto appointment,
        CancellationToken cancellationToken)
    {
        if (string.Equals(previousStatus, appointment.Status, StringComparison.Ordinal))
            return;

        if (appointment.Status is not AppointmentStatus.Confirmed and not AppointmentStatus.Cancelled)
        {
            if (appointment.Status == AppointmentStatus.CheckedIn)
                await NotifyDoctorPatientCheckedInAsync(appointment, cancellationToken);
            return;
        }

        var patientUserId = await _appointments.GetPatientUserIdAsync(
            appointment.PatientProfileId,
            cancellationToken);

        if (!patientUserId.HasValue)
            return;

        var isConfirmed = appointment.Status == AppointmentStatus.Confirmed;
        var scheduledAt = FormatNotificationDateTime(appointment.ScheduledStart);

        await TryCreateNotificationAsync(
            new CreateNotificationRequestDto
            {
                UserId = patientUserId.Value,
                Type = "appointment",
                Title = isConfirmed ? "Appointment confirmed" : "Appointment cancelled",
                Message = $"Your appointment with {appointment.DoctorName} on {scheduledAt} was {(isConfirmed ? "confirmed" : "cancelled")}.",
                RelatedEntityType = "Appointment",
                RelatedEntityId = appointment.Id.ToString()
            },
            cancellationToken);
    }

    private async Task NotifyDoctorPatientCheckedInAsync(
        AppointmentDto appointment,
        CancellationToken cancellationToken)
    {
        var doctorUserId = await _appointments.GetDoctorUserIdAsync(
            appointment.DoctorProfileId,
            cancellationToken);
        if (!doctorUserId.HasValue)
            return;

        await TryCreateNotificationAsync(
            new CreateNotificationRequestDto
            {
                UserId = doctorUserId.Value,
                Type = "appointment",
                Title = "Patient checked in",
                Message = $"{appointment.PatientName} is checked in and ready for their appointment.",
                RelatedEntityType = "Appointment",
                RelatedEntityId = appointment.Id.ToString()
            },
            cancellationToken);
    }

    private async Task TryCreateNotificationAsync(
        CreateNotificationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _notificationService.CreateAsync(request, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(
                exception,
                "Failed to create notification for user {UserId} related to {RelatedEntityType} {RelatedEntityId}.",
                request.UserId,
                request.RelatedEntityType,
                request.RelatedEntityId);
        }
    }
}
