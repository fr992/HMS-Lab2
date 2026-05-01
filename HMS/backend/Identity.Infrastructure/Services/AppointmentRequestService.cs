using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;

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
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        if (dto.PreferredDate < today)
            throw new InvalidOperationException("Preferred date must be today or in the future.");

        if (dto.DateOfBirth >= today)
            throw new InvalidOperationException("Date of birth is not valid.");

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
            CreatedAt = entity.CreatedAt
        };
    }
}
