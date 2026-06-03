using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IAppointmentRequestService
{
    Task<AppointmentRequestDto> CreateAsync(
        CreateAppointmentRequestDto dto,
        CancellationToken ct);

    Task<PaginatedResponse<AppointmentRequestDto>> GetAllAsync(
        int actorUserId,
        IEnumerable<string> permissions,
        string? status,
        DateOnly? preferredDate,
        PaginationQuery pagination,
        CancellationToken ct);

    Task<AppointmentRequestDto?> GetByIdAsync(
        int id,
        int actorUserId,
        IEnumerable<string> permissions,
        CancellationToken ct);

    Task<AppointmentRequestDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentRequestStatusDto dto,
        int? actorUserId,
        CancellationToken ct);
}
