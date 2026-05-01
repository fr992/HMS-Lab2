using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity
{
    public interface IAppointmentService
    {
        Task<AppointmentDto> CreateAsync(CreateAppointmentDto request, int? actorUserId, CancellationToken cancellationToken);
        Task<AppointmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
        Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto request, int? actorUserId, CancellationToken cancellationToken);
        Task<AppointmentDto> UpdateStatusAsync(int id, UpdateAppointmentStatusDto request, int? actorUserId, CancellationToken cancellationToken);
        Task<List<AppointmentDto>> GetAppointmentsAsync(
            int actorUserId,
            IEnumerable<string> permissions,
            DateTimeOffset? date,
            DateTimeOffset? from,
            DateTimeOffset? to,
            CancellationToken cancellationToken);
    }
}
