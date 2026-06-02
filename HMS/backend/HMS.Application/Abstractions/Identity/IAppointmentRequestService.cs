using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IAppointmentRequestService
{
    Task<AppointmentRequestDto> CreateAsync(
        CreateAppointmentRequestDto dto,
        CancellationToken ct);

    Task<PaginatedResponse<AppointmentRequestDto>> GetAllAsync(
        string? status,
        DateOnly? preferredDate,
        PaginationQuery pagination,
        CancellationToken ct);

    Task<AppointmentRequestDto?> GetByIdAsync(
        int id,
        CancellationToken ct);

    Task<AppointmentRequestDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentRequestStatusDto dto,
        int? actorUserId,
        CancellationToken ct);
}
