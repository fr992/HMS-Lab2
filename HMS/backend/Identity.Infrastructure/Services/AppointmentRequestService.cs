using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Infrastructure.Common;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Identity.Infrastructure.Services.Patients;

public sealed class AppointmentRequestService : IAppointmentRequestService
{
    private readonly HmsDbContext _db;

    public AppointmentRequestService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<AppointmentRequestDto> CreateAsync(
        CreateAppointmentRequestDto dto,
        CancellationToken ct)
    {
        var onlineRequestsEnabled = await _db.Settings
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

        _db.AppointmentRequests.Add(entity);
        await _db.SaveChangesAsync(ct);

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
        var query = _db.AppointmentRequests
            .AsNoTracking()
            .AsQueryable();

        var canManageStatus = permissions.Contains("Appointments.ManageStatus");
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
        var query = _db.AppointmentRequests
            .AsNoTracking()
            .Where(a => a.Id == id);

        var canManageStatus = permissions.Contains("Appointments.ManageStatus");
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
        var entity = await _db.AppointmentRequests
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (entity == null)
            throw new NotFoundException("Appointment request not found.");

        var nextStatus = ParseStatus(dto.Status);
        var changed = entity.Status != nextStatus;
        if (dto.DoctorProfileId.HasValue && entity.DoctorProfileId != dto.DoctorProfileId)
        {
            await EnsureDoctorExistsAsync(dto.DoctorProfileId.Value, ct);
            entity.DoctorProfileId = dto.DoctorProfileId;
            changed = true;
        }

        if (nextStatus == AppointmentRequestStatus.Confirmed && !entity.DoctorProfileId.HasValue)
            throw new BadRequestException("Assign a doctor before confirming this appointment request.");

        if (changed)
        {
            entity.Status = nextStatus;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedById = actorUserId;

            await _db.SaveChangesAsync(ct);
        }

        return await LoadByIdForManagerAsync(id, ct)
            ?? throw new Exception("Appointment request was updated but could not be loaded.");
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
        var exists = await _db.DoctorProfiles.AnyAsync(
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
        return await _db.DoctorProfiles
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
        return await _db.AppointmentRequests
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
            Status = a.Status.ToString(),
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };
}
