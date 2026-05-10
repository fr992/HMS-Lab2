using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/invoices")]
public sealed class MyInvoicesController : ControllerBase
{
    private readonly IInvoiceService _service;

    public MyInvoicesController(IInvoiceService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission("Own.Invoices.View")]
    public async Task<ActionResult<PaginatedResponse<InvoiceDto>>> List(
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var result = await _service.ListForPatientUserAsync(CurrentUserId(), pagination, cancellationToken);
        return Ok(result);
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid authenticated user.");

        return userId;
    }
}
