using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

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

        var now = DateTime.UtcNow;
        var entity = new AppointmentRequest
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email.Trim(),
            Phone = dto.Phone.Trim(),
            DateOfBirth = dto.DateOfBirth,
            PreferredDate = dto.PreferredDate,
            ReasonForVisit = dto.ReasonForVisit.Trim(),
            Status = AppointmentRequestStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.AppointmentRequests.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new AppointmentRequestDto
        {
            Id = entity.Id,
            FirstName = entity.FirstName,
            LastName = entity.LastName,
            Email = entity.Email,
            Phone = entity.Phone,
            DateOfBirth = entity.DateOfBirth,
            PreferredDate = entity.PreferredDate,
            ReasonForVisit = entity.ReasonForVisit,
            Status = entity.Status.ToString(),
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task<List<AppointmentRequestDto>> GetAllAsync(
        string? status,
        DateOnly? preferredDate,
        CancellationToken ct)
    {
        var query = _db.AppointmentRequests
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var parsedStatus = ParseStatus(status);
            query = query.Where(a => a.Status == parsedStatus);
        }

        if (preferredDate.HasValue)
        {
            query = query.Where(a => a.PreferredDate == preferredDate.Value);
        }

        return await query
            .OrderBy(a => a.Status == AppointmentRequestStatus.Pending ? 0 : 1)
            .ThenBy(a => a.PreferredDate)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new AppointmentRequestDto
            {
                Id = a.Id,
                FirstName = a.FirstName,
                LastName = a.LastName,
                Email = a.Email,
                Phone = a.Phone,
                DateOfBirth = a.DateOfBirth,
                PreferredDate = a.PreferredDate,
                ReasonForVisit = a.ReasonForVisit,
                Status = a.Status.ToString(),
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<AppointmentRequestDto?> GetByIdAsync(
        int id,
        CancellationToken ct)
    {
        return await _db.AppointmentRequests
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new AppointmentRequestDto
            {
                Id = a.Id,
                FirstName = a.FirstName,
                LastName = a.LastName,
                Email = a.Email,
                Phone = a.Phone,
                DateOfBirth = a.DateOfBirth,
                PreferredDate = a.PreferredDate,
                ReasonForVisit = a.ReasonForVisit,
                Status = a.Status.ToString(),
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            })
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
        if (entity.Status != nextStatus)
        {
            entity.Status = nextStatus;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedById = actorUserId;

            await _db.SaveChangesAsync(ct);
        }

        return await GetByIdAsync(id, ct)
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
}
