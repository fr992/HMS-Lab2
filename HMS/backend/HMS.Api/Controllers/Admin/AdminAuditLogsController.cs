using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/audit-logs")]
public sealed class AdminAuditLogsController : ControllerBase
{
    private readonly IAuditLogQueryService _auditLogs;

    public AdminAuditLogsController(IAuditLogQueryService auditLogs)
    {
        _auditLogs = auditLogs;
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
        return Ok(await _auditLogs.QueryApplicationLogsAsync(
            from,
            to,
            skip,
            take,
            cancellationToken));
    }

    [HttpGet("system")]
    [RequirePermission("AuditLogs.Read")]
    public async Task<ActionResult<SystemAuditLogResponseDto>> QuerySystemLogs(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] string? level,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _auditLogs.QuerySystemLogsAsync(
            from,
            to,
            level,
            search,
            page,
            pageSize,
            cancellationToken));
    }
}
