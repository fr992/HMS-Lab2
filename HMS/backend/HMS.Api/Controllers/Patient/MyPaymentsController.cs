using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/payments")]
public sealed class MyPaymentsController : ControllerBase
{
    private readonly IStripeService _stripeService;

    public MyPaymentsController(IStripeService stripeService)
    {
        _stripeService = stripeService;
    }

    [HttpPost("pay-online")]
    [RequirePermission("Own.Payments.PayOnline")]
    public async Task<IActionResult> PayOnline(
        [FromBody] CreateStripeCheckoutDto request,
        CancellationToken cancellationToken)
    {
        var url = await _stripeService.CreatePatientCheckoutSessionAsync(
            request.InvoiceId,
            CurrentUserId(),
            cancellationToken);

        return Ok(new { url });
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
