using System.Data;
using System.Data.Common;
using HMS.Application.Abstractions.Persistence;
using HMS.Contracts.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace HMS.Persistence.Repositories;

public sealed class AuditLogRepository : IAuditLogRepository
{
    private readonly HmsDbContext _db;
    private readonly IConfiguration _configuration;

    public AuditLogRepository(
        HmsDbContext db,
        IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<AuditLogQueryResultDto> QueryApplicationLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        var query = _db.AuditLogs.AsNoTracking()
            .Include(auditLog => auditLog.User)
            .OrderByDescending(auditLog => auditLog.CreatedAt)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(auditLog => auditLog.CreatedAt >= from.Value.UtcDateTime);
        if (to.HasValue)
            query = query.Where(auditLog => auditLog.CreatedAt <= to.Value.UtcDateTime);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(skip)
            .Take(take)
            .Select(auditLog => new AuditLogItemDto(
                auditLog.Id,
                auditLog.UserId,
                auditLog.User != null ? auditLog.User.UserName : null,
                auditLog.Action,
                auditLog.Entity,
                auditLog.EntityId,
                auditLog.OldValue,
                auditLog.NewValue,
                auditLog.IpAddress,
                auditLog.CreatedAt))
            .ToListAsync(cancellationToken);

        return new AuditLogQueryResultDto(totalCount, skip, take, items);
    }

    public async Task<SystemAuditLogResponseDto> QuerySystemLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? level,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var offset = (page - 1) * pageSize;
        var tableName = GetSystemAuditLogsTableName();
        var normalizedLevel = NormalizeLevel(level);
        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();

        var connection = _db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await connection.OpenAsync(cancellationToken);

        try
        {
            var totalCount = await CountSystemLogsAsync(
                connection,
                tableName,
                from,
                to,
                normalizedLevel,
                normalizedSearch,
                cancellationToken);

            var items = await ReadSystemLogsAsync(
                connection,
                tableName,
                from,
                to,
                normalizedLevel,
                normalizedSearch,
                offset,
                pageSize,
                cancellationToken);

            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

            return new SystemAuditLogResponseDto(
                totalCount,
                page,
                pageSize,
                totalPages,
                page < totalPages,
                page > 1,
                items);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    private static async Task<int> CountSystemLogsAsync(
        DbConnection connection,
        string tableName,
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? level,
        string? search,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT COUNT(1)
            FROM {tableName}
            WHERE (@from IS NULL OR [TimeStamp] >= @from)
              AND (@to IS NULL OR [TimeStamp] <= @to)
              AND (
                  [Level] IN ('Error', 'Fatal')
                  OR CONVERT(nvarchar(max), [Properties]) LIKE '%PersistToAuditLog%'
              )
              AND (@level IS NULL OR [Level] = @level)
              AND (
                  @search IS NULL
                  OR [Message] LIKE @search
                  OR [MessageTemplate] LIKE @search
                  OR [Exception] LIKE @search
                  OR CONVERT(nvarchar(max), [Properties]) LIKE @search
              );
            """;
        AddSystemAuditParameters(command, from, to, level, search);

        var value = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(value);
    }

    private static async Task<IReadOnlyList<SystemAuditLogItemDto>> ReadSystemLogsAsync(
        DbConnection connection,
        string tableName,
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? level,
        string? search,
        int offset,
        int pageSize,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT [Id],
                   [Message],
                   [MessageTemplate],
                   [Level],
                   [TimeStamp],
                   [Exception],
                   CONVERT(nvarchar(max), [Properties]) AS [Properties]
            FROM {tableName}
            WHERE (@from IS NULL OR [TimeStamp] >= @from)
              AND (@to IS NULL OR [TimeStamp] <= @to)
              AND (
                  [Level] IN ('Error', 'Fatal')
                  OR CONVERT(nvarchar(max), [Properties]) LIKE '%PersistToAuditLog%'
              )
              AND (@level IS NULL OR [Level] = @level)
              AND (
                  @search IS NULL
                  OR [Message] LIKE @search
                  OR [MessageTemplate] LIKE @search
                  OR [Exception] LIKE @search
                  OR CONVERT(nvarchar(max), [Properties]) LIKE @search
              )
            ORDER BY [TimeStamp] DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
            """;
        AddSystemAuditParameters(command, from, to, level, search);
        AddParameter(command, "@offset", offset);
        AddParameter(command, "@pageSize", pageSize);

        var items = new List<SystemAuditLogItemDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new SystemAuditLogItemDto(
                reader.GetInt32(reader.GetOrdinal("Id")),
                ReadString(reader, "Message"),
                ReadString(reader, "MessageTemplate"),
                ReadString(reader, "Level"),
                DateTime.SpecifyKind(reader.GetDateTime(reader.GetOrdinal("TimeStamp")), DateTimeKind.Utc),
                ReadString(reader, "Exception"),
                ReadString(reader, "Properties")));
        }

        return items;
    }

    private string GetSystemAuditLogsTableName()
    {
        var tableName = _configuration["Serilog:SqlServer:TableName"] ?? "SystemAuditLogs";
        return $"[dbo].[{EscapeIdentifier(tableName)}]";
    }

    private static string EscapeIdentifier(string identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier))
            throw new InvalidOperationException("Serilog:SqlServer:TableName is required.");

        return identifier.Replace("]", "]]", StringComparison.Ordinal);
    }

    private static string? NormalizeLevel(string? level)
    {
        if (string.IsNullOrWhiteSpace(level) || string.Equals(level, "all", StringComparison.OrdinalIgnoreCase))
            return null;

        var trimmed = level.Trim();
        return trimmed.Equals("Information", StringComparison.OrdinalIgnoreCase) ||
               trimmed.Equals("Fatal", StringComparison.OrdinalIgnoreCase) ||
               trimmed.Equals("Error", StringComparison.OrdinalIgnoreCase) ||
               trimmed.Equals("Warning", StringComparison.OrdinalIgnoreCase)
            ? char.ToUpperInvariant(trimmed[0]) + trimmed[1..].ToLowerInvariant()
            : null;
    }

    private static void AddSystemAuditParameters(
        DbCommand command,
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? level,
        string? search)
    {
        AddParameter(command, "@from", from?.UtcDateTime);
        AddParameter(command, "@to", to?.UtcDateTime);
        AddParameter(command, "@level", level);
        AddParameter(command, "@search", search is null ? null : $"%{search}%");
    }

    private static void AddParameter(DbCommand command, string name, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }

    private static string? ReadString(DbDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }
}
