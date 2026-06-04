using HMS.Api.Authorization;
using HMS.Persistence;
using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/audit-logs")]
public sealed class AdminAuditLogsController : ControllerBase
{
    private readonly HmsDbContext _db;
    private readonly IConfiguration _configuration;

    public AdminAuditLogsController(HmsDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpGet]
    [RequirePermission("AuditLogs.Read")]
    public async Task<IActionResult> Query(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        skip = Math.Max(0, skip);

        var query = _db.AuditLogs.AsNoTracking()
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(a => a.CreatedAt >= from.Value.UtcDateTime);
        if (to.HasValue)
            query = query.Where(a => a.CreatedAt <= to.Value.UtcDateTime);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip(skip)
            .Take(take)
            .Select(a => new
            {
                a.Id,
                a.UserId,
                UserName = a.User != null ? a.User.UserName : null,
                a.Action,
                a.Entity,
                a.EntityId,
                a.OldValue,
                a.NewValue,
                a.IpAddress,
                a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new { totalCount, skip, take, items });
    }

    [HttpGet("system")]
    [RequirePermission("AuditLogs.Read")]
    public async Task<ActionResult<SystemAuditLogResponse>> QuerySystemLogs(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] string? level,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

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

            return Ok(new SystemAuditLogResponse(
                totalCount,
                page,
                pageSize,
                totalPages,
                page < totalPages,
                page > 1,
                items));
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    private async Task<int> CountSystemLogsAsync(
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

    private async Task<IReadOnlyList<SystemAuditLogItem>> ReadSystemLogsAsync(
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

        var items = new List<SystemAuditLogItem>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new SystemAuditLogItem(
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

    public sealed record SystemAuditLogResponse(
        int TotalCount,
        int Page,
        int PageSize,
        int TotalPages,
        bool HasNextPage,
        bool HasPreviousPage,
        IReadOnlyList<SystemAuditLogItem> Items);

    public sealed record SystemAuditLogItem(
        int Id,
        string? Message,
        string? MessageTemplate,
        string? Level,
        DateTime CreatedAt,
        string? Exception,
        string? Properties);
}
