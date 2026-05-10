using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity
{
    public interface IInvoiceService
    {
        Task<InvoiceDto> CreateAsync(CreateInvoiceDto request, int actorUserId, CancellationToken cancellationToken);
        Task<InvoiceDto> GetByIdAsync(int id, CancellationToken cancellationToken);
        Task<PaginatedResponse<InvoiceDto>> ListAsync(
            int? patientId,
            string? status,
            PaginationQuery pagination,
            CancellationToken cancellationToken);

        Task<PaginatedResponse<InvoiceDto>> ListForPatientUserAsync(
            int userId,
            PaginationQuery pagination,
            CancellationToken cancellationToken);
        Task<InvoiceDto> UpdateStatusAsync(int id, UpdateInvoiceStatusDto request, int actorUserId, CancellationToken cancellationToken);
        Task<InvoiceDto> CancelAsync(int id, int actorUserId, CancellationToken cancellationToken);
    }
}
