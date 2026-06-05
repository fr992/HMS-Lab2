namespace HMS.Contracts.Identity;

public sealed record AuditLogQueryResultDto(
    int TotalCount,
    int Skip,
    int Take,
    IReadOnlyList<AuditLogItemDto> Items);

public sealed record AuditLogItemDto(
    int Id,
    int? UserId,
    string? UserName,
    string Action,
    string Entity,
    int? EntityId,
    string? OldValue,
    string? NewValue,
    string? IpAddress,
    DateTime CreatedAt);

public sealed record SystemAuditLogResponseDto(
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages,
    bool HasNextPage,
    bool HasPreviousPage,
    IReadOnlyList<SystemAuditLogItemDto> Items);

public sealed record SystemAuditLogItemDto(
    int Id,
    string? Message,
    string? MessageTemplate,
    string? Level,
    DateTime CreatedAt,
    string? Exception,
    string? Properties);
