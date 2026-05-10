using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IPaymentService
{
    Task<PaymentDto> CreateAsync(CreatePaymentDto request, int actorUserId, CancellationToken cancellationToken);
    Task<PaymentDto> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<PaginatedResponse<PaymentDto>> ListAsync(PaymentListQueryDto query, CancellationToken cancellationToken);
    Task<PaymentDto> UpdateStatusAsync(int id, UpdatePaymentStatusDto request, int actorUserId, CancellationToken cancellationToken);
    Task<PaymentDto> ConfirmCashAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
