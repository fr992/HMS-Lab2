using System.Text;
using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class StripeControllerTests
{
    [Fact]
    public async Task Checkout_ReturnsCheckoutUrl()
    {
        var service = new Mock<IStripeService>();
        var controller = new StripeController(service.Object);
        service
            .Setup(s => s.CreateCheckoutSessionAsync(6, It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://checkout.example.test/session");

        var result = await controller.Checkout(6, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("checkout.example.test", ok.Value!.ToString());
    }

    [Fact]
    public async Task ConfirmCheckout_ReturnsPayment()
    {
        var service = new Mock<IStripeService>();
        var controller = new StripeController(service.Object);
        var payment = new PaymentDto { Id = 7, Status = "Completed" };
        service
            .Setup(s => s.ConfirmCheckoutSessionAsync("session-id", It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await controller.ConfirmCheckout("session-id", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(payment, ok.Value);
    }

    [Fact]
    public async Task Webhook_ReadsBodyAndSignature()
    {
        var service = new Mock<IStripeService>();
        var controller = new StripeController(service.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
        controller.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes("{\"type\":\"checkout.session.completed\"}"));
        controller.Request.Headers["Stripe-Signature"] = "sig";

        var result = await controller.Webhook(CancellationToken.None);

        Assert.IsType<OkResult>(result);
        service.Verify(
            s => s.HandleWebhookAsync(
                "{\"type\":\"checkout.session.completed\"}",
                "sig",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
