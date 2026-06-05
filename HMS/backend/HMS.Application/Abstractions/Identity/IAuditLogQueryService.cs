using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IAuditLogQueryService
{
    Task<AuditLogQueryResultDto> QueryApplicationLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        int skip,
        int take,
        CancellationToken cancellationToken);

    Task<SystemAuditLogResponseDto> QuerySystemLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? level,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken);
}
