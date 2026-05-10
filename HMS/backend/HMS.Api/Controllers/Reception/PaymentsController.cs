using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service;

    public PaymentsController(IPaymentService service)
    {
        _service = service;
    }

    [HttpGet("{id:int}")]
    [RequirePermission("Payments.Read")]
    public async Task<ActionResult<PaymentDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    [RequirePermission("Payments.Read")]
    public async Task<ActionResult<PaginatedResponse<PaymentDto>>> List(
        [FromQuery] PaymentListQueryDto query,
        CancellationToken cancellationToken)
    {
        var result = await _service.ListAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission("Payments.Create")]
    public async Task<ActionResult<PaymentDto>> Create(
        [FromBody] CreatePaymentDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, CurrentUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:int}/status")]
    [RequirePermission("Payments.UpdateStatus")]
    public async Task<ActionResult<PaymentDto>> UpdateStatus(
        int id,
        [FromBody] UpdatePaymentStatusDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateStatusAsync(id, request, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:int}/confirm-cash")]
    [RequirePermission("Payments.ConfirmCash")]
    public async Task<ActionResult<PaymentDto>> ConfirmCash(int id, CancellationToken cancellationToken)
    {
        var result = await _service.ConfirmCashAsync(id, CurrentUserId(), cancellationToken);
        return Ok(result);
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

        if (!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid user ID in token.");

        return userId;
    }
}
