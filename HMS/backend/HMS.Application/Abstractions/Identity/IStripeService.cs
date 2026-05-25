using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IStripeService
{
    Task<string> CreateCheckoutSessionAsync(int paymentId, CancellationToken cancellationToken);

    Task<string> CreatePatientCheckoutSessionAsync(
        int invoiceId,
        int patientUserId,
        CancellationToken cancellationToken);

    Task<PaymentDto> ConfirmCheckoutSessionAsync(
        string sessionId,
        CancellationToken cancellationToken);

    Task HandleWebhookAsync(
        string json,
        string signature,
        CancellationToken cancellationToken);
}
