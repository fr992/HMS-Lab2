using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using Stripe;
using Stripe.Checkout;

namespace Identity.Infrastructure.Services;

public sealed class StripeService : IStripeService
{
    private const string OnlinePaymentMethod = "online";

    private readonly IHmsRepository _db;


    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;
    private readonly IPaymentService _paymentService;

    public StripeService(
        IHmsRepository db,
        IUnitOfWork unitOfWork,
        IConfiguration configuration,
        IPaymentService paymentService)
    {
        _db = db;

        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _paymentService = paymentService;

        StripeConfiguration.ApiKey = GetStripeSecretKey();
    }

    public async Task<string> CreateCheckoutSessionAsync(
        int paymentId,
        CancellationToken cancellationToken)
    {
        var payment = await GetCheckoutPaymentAsync(paymentId, cancellationToken);
        var options = BuildSessionOptions(payment);
        var service = new SessionService();

        Session session;
        try
        {
            session = await service.CreateAsync(
                options,
                cancellationToken: cancellationToken);
        }
        catch (StripeException exception)
        {
            throw new BadRequestException(
                $"Stripe checkout could not be started: {exception.StripeError?.Message ?? exception.Message}",
                exception);
        }

        payment.StripeSessionId = session.Id;
        payment.TransactionReference = session.Id;
        payment.UpdatedAt = DateTime.UtcNow;

        await SaveStripePaymentChangesAsync(cancellationToken);

        return session.Url;
    }

    public async Task<string> CreatePatientCheckoutSessionAsync(
        int invoiceId,
        int patientUserId,
        CancellationToken cancellationToken)
    {
        if (invoiceId <= 0)
            throw new BadRequestException("Invoice is required.");

        var invoice = await _db.Query<HMS.Domain.Entities.Invoice>()
            .AsNoTracking()
            .Where(x => x.Id == invoiceId)
            .Select(x => new
            {
                x.Id,
                x.TotalAmount,
                x.Status,
                PatientUserId = x.PatientProfile.Person.UserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (invoice is null)
            throw new NotFoundException("Invoice not found.");

        if (invoice.PatientUserId != patientUserId)
            throw new ForbiddenException("This invoice does not belong to the current patient.");

        if (invoice.Status == InvoiceStatus.Paid)
            throw new ConflictException("Invoice is already paid.");

        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new ConflictException("Cancelled invoices cannot be paid online.");

        var paidAmount = await _db.Query<Payment>()
            .AsNoTracking()
            .Where(x => x.InvoiceId == invoice.Id && x.Status == PaymentStatus.Paid)
            .SumAsync(x => x.Amount, cancellationToken);

        var remainingAmount = decimal.Round(invoice.TotalAmount - paidAmount, 2);
        if (remainingAmount <= 0)
            throw new ConflictException("Invoice is already paid.");

        var payment = await _db.Query<Payment>()
            .Where(x =>
                x.InvoiceId == invoice.Id &&
                x.Status == PaymentStatus.Pending &&
                x.PaymentMethod == OnlinePaymentMethod)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (payment is null)
        {
            var now = DateTime.UtcNow;
            payment = new Payment
            {
                InvoiceId = invoice.Id,
                Amount = remainingAmount,
                PaymentMethod = OnlinePaymentMethod,
                Status = PaymentStatus.Pending,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = patientUserId,
                UpdatedById = patientUserId
            };
            _db.Add<Payment>(payment);
            await SaveStripePaymentChangesAsync(cancellationToken);
        }
        else if (payment.Amount != remainingAmount)
        {
            payment.Amount = remainingAmount;
            payment.UpdatedAt = DateTime.UtcNow;
            payment.UpdatedById = patientUserId;
            await SaveStripePaymentChangesAsync(cancellationToken);
        }

        return await CreateCheckoutSessionAsync(payment.Id, cancellationToken);
    }

    public async Task HandleWebhookAsync(
        string json,
        string signature,
        CancellationToken cancellationToken)
    {
        var webhookSecret = _configuration["Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret))
            throw new InvalidOperationException("Stripe:WebhookSecret is required to validate webhook events.");

        var stripeEvent = EventUtility.ConstructEvent(
            json,
            signature,
            webhookSecret);

        if (stripeEvent.Type != "checkout.session.completed")
            return;

        if (stripeEvent.Data.Object is not Session session)
            return;

        await ConfirmCompletedSessionAsync(session, cancellationToken);
    }

    public async Task<PaymentDto> ConfirmCheckoutSessionAsync(
        string sessionId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
            throw new BadRequestException("Stripe checkout session is required.");

        var service = new SessionService();

        Session session;
        try
        {
            session = await service.GetAsync(
                sessionId,
                cancellationToken: cancellationToken);
        }
        catch (StripeException exception)
        {
            throw new BadRequestException(
                $"Stripe checkout session could not be verified: {exception.StripeError?.Message ?? exception.Message}",
                exception);
        }

        return await ConfirmCompletedSessionAsync(session, cancellationToken)
            ?? throw new ConflictException("Stripe checkout session is not paid yet.");
    }

    private async Task<Payment> GetCheckoutPaymentAsync(
        int paymentId,
        CancellationToken cancellationToken)
    {
        var payment = await _db.Query<Payment>()
            .Include(x => x.Invoice)
            .FirstOrDefaultAsync(x => x.Id == paymentId, cancellationToken);

        if (payment is null)
            throw new NotFoundException("Payment not found.");

        if (payment.Status != PaymentStatus.Pending)
            throw new ConflictException("Only pending payments can be paid online.");

        if (!string.Equals(payment.PaymentMethod, OnlinePaymentMethod, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(payment.PaymentMethod, "card", StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("Only online or card payments can use Stripe checkout.");

        if (payment.Invoice.Status == InvoiceStatus.Cancelled)
            throw new ConflictException("Cancelled invoices cannot be paid online.");

        return payment;
    }

    private SessionCreateOptions BuildSessionOptions(Payment payment)
    {
        var currency = string.IsNullOrWhiteSpace(payment.Invoice.Currency)
            ? "eur"
            : payment.Invoice.Currency.Trim().ToLowerInvariant();

        return new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = GetRedirectUrl("SuccessUrl", "/payment-success?session_id={CHECKOUT_SESSION_ID}"),
            CancelUrl = GetRedirectUrl("CancelUrl", "/payment-cancel"),
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = currency,
                        UnitAmount = ToStripeMinorUnits(payment.Amount),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Invoice {payment.Invoice.InvoiceNumber}"
                        }
                    }
                }
            ],
            Metadata = new Dictionary<string, string>
            {
                ["paymentId"] = payment.Id.ToString(),
                ["invoiceId"] = payment.InvoiceId.ToString()
            }
        };
    }

    private string GetStripeSecretKey()
    {
        var key = _configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Stripe:SecretKey is required.");

        return key;
    }

    private string GetRedirectUrl(string key, string fallbackPath)
    {
        var configured = _configuration[$"Stripe:{key}"];
        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        return $"{frontendBaseUrl.TrimEnd('/')}{fallbackPath}";
    }

    private static long ToStripeMinorUnits(decimal amount)
    {
        return decimal.ToInt64(decimal.Round(amount * 100m, 0, MidpointRounding.AwayFromZero));
    }

    private async Task<PaymentDto?> ConfirmCompletedSessionAsync(
        Session session,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
            return null;

        var paymentId = TryGetPaymentId(session);
        var payment = paymentId.HasValue
            ? await _db.Query<Payment>().FirstOrDefaultAsync(x => x.Id == paymentId.Value, cancellationToken)
            : await _db.Query<Payment>().FirstOrDefaultAsync(x => x.StripeSessionId == session.Id, cancellationToken);

        if (payment is null)
            return null;

        payment.StripeSessionId ??= session.Id;
        payment.StripePaymentIntentId = session.PaymentIntentId;
        payment.TransactionReference = session.PaymentIntentId ?? session.Id;
        payment.UpdatedAt = DateTime.UtcNow;

        await SaveStripePaymentChangesAsync(cancellationToken);

        return await _paymentService.UpdateStatusAsync(
            payment.Id,
            new UpdatePaymentStatusDto
            {
                Status = PaymentStatus.Paid
            },
            payment.CreatedById ?? 1,
            cancellationToken);
    }

    private static int? TryGetPaymentId(Session session)
    {
        if (session.Metadata.TryGetValue("paymentId", out var paymentIdRaw) &&
            int.TryParse(paymentIdRaw, out var paymentId))
        {
            return paymentId;
        }

        return null;
    }

    private async Task SaveStripePaymentChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsMissingStripeColumn(exception))
        {
            throw new ConflictException(
                "Stripe payment columns are missing from the database. Run the AddStripe migration before using online payments.",
                exception);
        }
    }

    private static bool IsMissingStripeColumn(DbUpdateException exception)
    {
        return exception.InnerException is SqlException sqlException &&
            sqlException.Number == 207 &&
            (sqlException.Message.Contains("StripeSessionId", StringComparison.OrdinalIgnoreCase) ||
             sqlException.Message.Contains("StripePaymentIntentId", StringComparison.OrdinalIgnoreCase));
    }
}
