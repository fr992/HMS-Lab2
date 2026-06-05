using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Contracts.Identity;

namespace Identity.Infrastructure.Services;

public sealed class AuditLogQueryService : IAuditLogQueryService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogQueryService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public Task<AuditLogQueryResultDto> QueryApplicationLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        return _auditLogRepository.QueryApplicationLogsAsync(
            from,
            to,
            Math.Max(0, skip),
            Math.Clamp(take, 1, 500),
            cancellationToken);
    }

    public Task<SystemAuditLogResponseDto> QuerySystemLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? level,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        return _auditLogRepository.QuerySystemLogsAsync(
            from,
            to,
            level,
            search,
            Math.Max(1, page),
            Math.Clamp(pageSize, 1, 100),
            cancellationToken);
    }
}
