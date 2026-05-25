using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/stripe")]
public sealed class StripeController : ControllerBase
{
    private readonly IStripeService _stripeService;

    public StripeController(IStripeService stripeService)
    {
        _stripeService = stripeService;
    }

    [HttpPost("checkout/{paymentId:int}")]
    [RequirePermission("Payments.Create")]
    public async Task<IActionResult> Checkout(
        int paymentId,
        CancellationToken cancellationToken)
    {
        var url = await _stripeService.CreateCheckoutSessionAsync(
            paymentId,
            cancellationToken);

        return Ok(new { url });
    }

    [HttpPost("checkout/confirm")]
    public async Task<IActionResult> ConfirmCheckout(
        [FromQuery] string sessionId,
        CancellationToken cancellationToken)
    {
        var payment = await _stripeService.ConfirmCheckoutSessionAsync(
            sessionId,
            cancellationToken);

        return Ok(payment);
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        var json = await new StreamReader(Request.Body)
            .ReadToEndAsync(cancellationToken);

        var signature = Request.Headers["Stripe-Signature"].ToString();

        await _stripeService.HandleWebhookAsync(
            json,
            signature,
            cancellationToken);

        return Ok();
    }
}
