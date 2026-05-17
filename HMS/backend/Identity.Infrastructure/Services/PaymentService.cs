using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Identity.Infrastructure.Services;

public sealed class PaymentService : IPaymentService
{
    private const string CashPaymentMethod = "cash";

    private readonly HmsDbContext _db;
    private readonly INotificationService _notificationService;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        HmsDbContext db,
        INotificationService notificationService,
        ILogger<PaymentService> logger)
    {
        _db = db;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<PaymentDto> CreateAsync(
        CreatePaymentDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.InvoiceId <= 0)
            throw new BadRequestException("Invoice is required.");

        if (request.Amount <= 0)
            throw new BadRequestException("Payment amount must be greater than zero.");

        var invoiceExists = await _db.Invoices
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.InvoiceId, cancellationToken);

        if (!invoiceExists)
            throw new NotFoundException("Invoice not found.");

        var paymentMethod = NormalizeRequired(request.PaymentMethod, "Payment method is required.").ToLowerInvariant();
        var now = DateTime.UtcNow;
        var payment = new Payment
        {
            InvoiceId = request.InvoiceId,
            Amount = decimal.Round(request.Amount, 2),
            PaymentMethod = paymentMethod,
            Status = PaymentStatus.Pending,
            PaidAt = null,
            TransactionReference = NormalizeOptional(request.TransactionReference),
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(payment.Id, cancellationToken);
    }

    public async Task<PaymentDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var payment = await ProjectToDto(_db.Payments.AsNoTracking().Where(x => x.Id == id))
            .FirstOrDefaultAsync(cancellationToken);

        if (payment is null)
            throw new NotFoundException("Payment not found.");

        return payment;
    }

    public async Task<PaginatedResponse<PaymentDto>> ListAsync(
        PaymentListQueryDto query,
        CancellationToken cancellationToken)
    {
        var pagination = new PaginationQuery
        {
            Page = query.Page,
            PageSize = query.PageSize,
            Search = query.Search
        };

        var status = NormalizeOptional(query.Status);
        var paymentMethod = NormalizeOptional(query.PaymentMethod)?.ToLowerInvariant();
        var search = NormalizeOptional(query.Search);

        if (status is not null)
            status = NormalizeStatus(status);

        var payments = _db.Payments
            .AsNoTracking()
            .Where(x => !query.InvoiceId.HasValue || x.InvoiceId == query.InvoiceId.Value)
            .Where(x => status == null || x.Status == status)
            .Where(x => paymentMethod == null || x.PaymentMethod == paymentMethod)
            .Where(x => !query.FromDate.HasValue || x.CreatedAt >= query.FromDate.Value)
            .Where(x => !query.ToDate.HasValue || x.CreatedAt <= query.ToDate.Value)
            .Where(x => search == null ||
                x.Invoice.InvoiceNumber.Contains(search) ||
                (x.TransactionReference != null && x.TransactionReference.Contains(search)));

        return await ProjectToDto(payments
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id))
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<PaymentDto> UpdateStatusAsync(
        int id,
        UpdatePaymentStatusDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var payment = await _db.Payments
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (payment is null)
            throw new NotFoundException("Payment not found.");

        var previousStatus = payment.Status;
        var status = NormalizeStatus(request.Status);
        EnsureStatusTransition(payment.Status, status);

        payment.Status = status;
        payment.UpdatedAt = DateTime.UtcNow;
        payment.UpdatedById = actorUserId;

        if (status == PaymentStatus.Paid && !payment.PaidAt.HasValue)
            payment.PaidAt = payment.UpdatedAt;

        await _db.SaveChangesAsync(cancellationToken);

        await NotifyPatientPaymentConfirmedAsync(payment.Id, previousStatus, payment.Status, cancellationToken);

        return await GetByIdAsync(payment.Id, cancellationToken);
    }

    public async Task<PaymentDto> ConfirmCashAsync(
        int id,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var payment = await _db.Payments
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (payment is null)
            throw new NotFoundException("Payment not found.");

        var previousStatus = payment.Status;

        if (!string.Equals(payment.PaymentMethod, CashPaymentMethod, StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("Only cash payments can be confirmed.");

        EnsureCanConfirmCash(payment.Status);

        var now = DateTime.UtcNow;
        payment.Status = PaymentStatus.Paid;
        payment.PaidAt ??= now;
        payment.ReceivedByUserId = actorUserId;
        payment.UpdatedAt = now;
        payment.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        await NotifyPatientPaymentConfirmedAsync(payment.Id, previousStatus, payment.Status, cancellationToken);

        return await GetByIdAsync(payment.Id, cancellationToken);
    }

    private static IQueryable<PaymentDto> ProjectToDto(IQueryable<Payment> query)
    {
        return query.Select(payment => new PaymentDto
        {
            Id = payment.Id,
            InvoiceId = payment.InvoiceId,
            InvoiceNumber = payment.Invoice.InvoiceNumber,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            Status = payment.Status,
            PaidAt = payment.PaidAt,
            TransactionReference = payment.TransactionReference,
            ReceivedByUserId = payment.ReceivedByUserId,
            ReceivedByUserName = payment.ReceivedByUser == null
                ? null
                : payment.ReceivedByUser.UserName,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        });
    }

    private static void EnsureCanConfirmCash(string currentStatus)
    {
        if (currentStatus is PaymentStatus.Paid)
            throw new ConflictException("Payment is already paid.");

        if (currentStatus is PaymentStatus.Cancelled or PaymentStatus.Refunded)
            throw new ConflictException("Cancelled or refunded payments cannot be confirmed.");
    }

    private static void EnsureStatusTransition(string currentStatus, string nextStatus)
    {
        if (currentStatus == nextStatus)
            return;

        if (currentStatus is PaymentStatus.Cancelled or PaymentStatus.Refunded)
            throw new ConflictException("Cancelled or refunded payments cannot be updated.");

        if (currentStatus == PaymentStatus.Paid && nextStatus != PaymentStatus.Refunded)
            throw new ConflictException("Paid payments can only be refunded.");

        if (currentStatus == PaymentStatus.Failed && nextStatus is PaymentStatus.Paid)
            throw new ConflictException("Failed payments cannot be marked paid directly.");
    }

    private static string NormalizeStatus(string status)
    {
        if (!PaymentStatus.IsKnownStatus(status))
            throw new BadRequestException("Invalid payment status.");

        return PaymentStatus.NormalizeToKnownStatus(status);
    }

    private static string NormalizeRequired(string? value, string errorMessage)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new BadRequestException(errorMessage);

        return value.Trim();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task NotifyPatientPaymentConfirmedAsync(
        int paymentId,
        string previousStatus,
        string currentStatus,
        CancellationToken cancellationToken)
    {
        if (previousStatus == PaymentStatus.Paid || currentStatus != PaymentStatus.Paid)
            return;

        var notificationData = await _db.Payments
            .AsNoTracking()
            .Where(payment => payment.Id == paymentId)
            .Select(payment => new
            {
                payment.Id,
                payment.Amount,
                payment.Invoice.InvoiceNumber,
                PatientUserId = payment.Invoice.PatientProfile.Person.UserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (notificationData?.PatientUserId is null)
            return;

        await TryCreateNotificationAsync(
            new CreateNotificationRequestDto
            {
                UserId = notificationData.PatientUserId.Value,
                Type = "payment",
                Title = "Payment confirmed",
                Message = $"Payment of {notificationData.Amount:0.00} for invoice {notificationData.InvoiceNumber} was confirmed.",
                RelatedEntityType = "Payment",
                RelatedEntityId = notificationData.Id.ToString()
            },
            cancellationToken);
    }

    private async Task TryCreateNotificationAsync(
        CreateNotificationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _notificationService.CreateAsync(request, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(
                exception,
                "Failed to create notification for user {UserId} related to {RelatedEntityType} {RelatedEntityId}.",
                request.UserId,
                request.RelatedEntityType,
                request.RelatedEntityId);
        }
    }
}
