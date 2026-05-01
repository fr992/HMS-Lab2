using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IAppointmentRequestService
{
    Task<AppointmentRequestDto> CreateAsync(
        CreateAppointmentRequestDto dto,
        CancellationToken ct);
}
