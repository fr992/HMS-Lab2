using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/invoices")]
public sealed class ReceptionInvoicesController : ControllerBase
{
    private readonly IInvoiceService _service;

    public ReceptionInvoicesController(IInvoiceService service)
    {
        _service = service;
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Invoices.Read")]
    public async Task<ActionResult<InvoiceDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    [RequirePermission("Invoices.Read")]
    public async Task<ActionResult<PaginatedResponse<InvoiceDto>>> List(
        [FromQuery] int? patientId,
        [FromQuery] string? status,
        [FromQuery] PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var result = await _service.ListAsync(patientId, status, pagination, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission("Invoices.Create")]
    public async Task<ActionResult<InvoiceDto>> Create(
        [FromBody] CreateInvoiceDto request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, CurrentUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}/status")]
    [RequirePermission("Invoices.Update")]
    public async Task<ActionResult<InvoiceDto>> UpdateStatus(
        int id,
        [FromBody] UpdateInvoiceStatusDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateStatusAsync(id, request, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:int}/cancel")]
    [RequirePermission("Invoices.Cancel")]
    public async Task<ActionResult<InvoiceDto>> Cancel(int id, CancellationToken cancellationToken)
    {
        var result = await _service.CancelAsync(id, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if(!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid user ID in token.");

        return userId;
    }
}
