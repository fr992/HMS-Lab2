using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using Identity.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Identity.Infrastructure.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class InvoiceService : IInvoiceService
{
    private readonly IHmsRepository _db;

    private readonly IUnitOfWork _unitOfWork;

    public InvoiceService(IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;

        _unitOfWork = unitOfWork;
    }

    public async Task<InvoiceDto> CreateAsync(
        CreateInvoiceDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.PatientProfileId <= 0)
            throw new BadRequestException("Patient profile is required.");

        if (request.Items.Count == 0)
            throw new BadRequestException("Invoice must contain at least one item.");

        var patientExists = await _db.Query<PatientProfile>()
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.PatientProfileId, cancellationToken);

        if (!patientExists)
            throw new NotFoundException("Patient not found.");

        if (request.EncounterId.HasValue)
            await EnsureEncounterMatchesPatientAsync(request.EncounterId.Value, request.PatientProfileId, cancellationToken);

        var currency = NormalizeCurrency(request.Currency);
        var now = DateTime.UtcNow;
        var items = BuildItems(request.Items, now);
        var subtotal = decimal.Round(items.Sum(x => x.TotalPrice), 2);
        var discount = decimal.Round(request.DiscountAmount, 2);
        var tax = decimal.Round(request.TaxAmount, 2);

        ValidateAmounts(subtotal, discount, tax);

        var invoice = new Invoice
        {
            InvoiceNumber = await GenerateInvoiceNumberAsync(now, cancellationToken),
            PatientProfileId = request.PatientProfileId,
            EncounterId = request.EncounterId,
            Currency = currency,
            SubtotalAmount = subtotal,
            DiscountAmount = discount,
            TaxAmount = tax,
            TotalAmount = decimal.Round(subtotal - discount + tax, 2),
            Status = InvoiceStatus.Issued,
            IssuedAt = now,
            DueAt = request.DueAt,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId,
            Items = items
        };

        _db.Add<Invoice>(invoice);

        await SaveCreatedInvoiceAsync(cancellationToken);

        return await GetByIdAsync(invoice.Id, cancellationToken);
    }

    public async Task<InvoiceDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var invoice = await ProjectToDto(_db.Query<Invoice>().AsNoTracking().Where(x => x.Id == id))
            .FirstOrDefaultAsync(cancellationToken);

        if (invoice is null)
            throw new NotFoundException("Invoice not found.");

        return invoice;
    }

    public async Task<PaginatedResponse<InvoiceDto>> ListAsync(
        int? patientId,
        string? status,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var normalizedStatus = NormalizeOptional(status);
        var search = NormalizeOptional(pagination.Search);

        if (normalizedStatus is not null)
            EnsureValidStatus(normalizedStatus);

        var query = _db.Query<Invoice>()
            .AsNoTracking()
            .Where(x => !patientId.HasValue || x.PatientProfileId == patientId.Value)
            .Where(x => normalizedStatus == null || x.Status == normalizedStatus)
            .Where(x => search == null ||
                x.InvoiceNumber.Contains(search) ||
                x.PatientProfile.PatientNumber.Contains(search) ||
                x.PatientProfile.Person.FirstName.Contains(search) ||
                x.PatientProfile.Person.LastName.Contains(search));

        return await ProjectToDto(query
                .OrderByDescending(x => x.IssuedAt)
                .ThenByDescending(x => x.Id))
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<PaginatedResponse<InvoiceDto>> ListForPatientUserAsync(
        int userId,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var patientProfileId = await _db.Query<PatientProfile>()
            .AsNoTracking()
            .Where(x => x.Person.UserId == userId)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!patientProfileId.HasValue)
            throw new ForbiddenException("Current user is not linked to a patient profile.");

        return await ListAsync(patientProfileId.Value, null, pagination, cancellationToken);
    }

    public async Task<InvoiceDto> UpdateStatusAsync(
        int id,
        UpdateInvoiceStatusDto request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var invoice = await _db.Query<Invoice>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (invoice is null)
            throw new NotFoundException("Invoice not found.");

        var status = NormalizeRequired(request.Status, "Invoice status is required.").ToLowerInvariant();
        EnsureValidStatus(status);
        EnsureStatusTransition(invoice.Status, status);

        invoice.Status = status;
        invoice.UpdatedAt = DateTime.UtcNow;
        invoice.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(invoice.Id, cancellationToken);
    }

    public async Task<InvoiceDto> CancelAsync(
        int id,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        return await UpdateStatusAsync(
            id,
            new UpdateInvoiceStatusDto { Status = InvoiceStatus.Cancelled },
            actorUserId,
            cancellationToken);
    }

    private static List<InvoiceItem> BuildItems(
        IReadOnlyList<CreateInvoiceItemDto> requestItems,
        DateTime now)
    {
        return requestItems.Select(item =>
        {
            var description = NormalizeRequired(item.Description, "Invoice item description is required.");

            if (item.Quantity <= 0)
                throw new BadRequestException("Invoice item quantity must be greater than zero.");

            if (item.UnitPrice < 0)
                throw new BadRequestException("Invoice item unit price cannot be negative.");

            var quantity = decimal.Round(item.Quantity, 2);
            var unitPrice = decimal.Round(item.UnitPrice, 2);

            return new InvoiceItem
            {
                Description = description,
                Quantity = quantity,
                UnitPrice = unitPrice,
                TotalPrice = decimal.Round(quantity * unitPrice, 2),
                SourceType = NormalizeOptional(item.SourceType),
                SourceId = item.SourceId,
                CreatedAt = now,
                UpdatedAt = now
            };
        }).ToList();
    }

    private async Task EnsureEncounterMatchesPatientAsync(
        int encounterId,
        int patientProfileId,
        CancellationToken cancellationToken)
    {
        var encounterPatientId = await _db.Query<Encounter>()
            .AsNoTracking()
            .Where(x => x.Id == encounterId)
            .Select(x => (int?)x.PatientProfileId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!encounterPatientId.HasValue)
            throw new NotFoundException("Encounter not found.");

        if (encounterPatientId.Value != patientProfileId)
            throw new BadRequestException("Encounter does not belong to the selected patient.");
    }

    private async Task<string> GenerateInvoiceNumberAsync(DateTime now, CancellationToken cancellationToken)
    {
        var prefix = $"INV-{now:yyyyMMdd}";
        var count = await _db.Query<Invoice>()
            .AsNoTracking()
            .CountAsync(x => x.InvoiceNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}-{count + 1:0000}";
    }

    private async Task SaveCreatedInvoiceAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new ConflictException("Invoice number already exists. Please retry creating the invoice.", ex);
        }
        catch (DbUpdateException ex) when (IsForeignKeyViolation(ex))
        {
            throw new BadRequestException("Invoice references a patient or encounter that no longer exists.", ex);
        }
    }

    private static IQueryable<InvoiceDto> ProjectToDto(IQueryable<Invoice> query)
    {
        return query.Select(invoice => new InvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            PatientProfileId = invoice.PatientProfileId,
            PatientName = invoice.PatientProfile.Person.FirstName + " " + invoice.PatientProfile.Person.LastName,
            PatientNumber = invoice.PatientProfile.PatientNumber,
            EncounterId = invoice.EncounterId,
            EncounterNumber = invoice.Encounter == null ? null : invoice.Encounter.EncounterNumber,
            Currency = invoice.Currency,
            SubtotalAmount = invoice.SubtotalAmount,
            DiscountAmount = invoice.DiscountAmount,
            TaxAmount = invoice.TaxAmount,
            TotalAmount = invoice.TotalAmount,
            Status = invoice.Status,
            IssuedAt = invoice.IssuedAt,
            DueAt = invoice.DueAt,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            Items = invoice.Items
                .OrderBy(item => item.Id)
                .Select(item => new InvoiceItemDto
                {
                    Id = item.Id,
                    InvoiceId = item.InvoiceId,
                    Description = item.Description,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalPrice = item.TotalPrice,
                    SourceType = item.SourceType,
                    SourceId = item.SourceId,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt
                })
                .ToList()
        });
    }

    private static void ValidateAmounts(decimal subtotal, decimal discount, decimal tax)
    {
        if (discount < 0)
            throw new BadRequestException("Discount amount cannot be negative.");

        if (tax < 0)
            throw new BadRequestException("Tax amount cannot be negative.");

        if (discount > subtotal)
            throw new BadRequestException("Discount amount cannot exceed subtotal.");
    }

    private static void EnsureStatusTransition(string currentStatus, string nextStatus)
    {
        if (string.Equals(currentStatus, InvoiceStatus.Cancelled, StringComparison.OrdinalIgnoreCase))
            throw new ConflictException("Cancelled invoices cannot be updated.");

        if (string.Equals(currentStatus, InvoiceStatus.Paid, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(nextStatus, InvoiceStatus.Paid, StringComparison.OrdinalIgnoreCase))
            throw new ConflictException("Paid invoices cannot be moved to another status.");

        if (string.Equals(nextStatus, InvoiceStatus.Cancelled, StringComparison.OrdinalIgnoreCase) &&
            (string.Equals(currentStatus, InvoiceStatus.Paid, StringComparison.OrdinalIgnoreCase) ||
             string.Equals(currentStatus, InvoiceStatus.PartiallyPaid, StringComparison.OrdinalIgnoreCase)))
            throw new ConflictException("Paid or partially paid invoices cannot be cancelled.");
    }

    private static void EnsureValidStatus(string status)
    {
        if (status is not InvoiceStatus.Draft
            and not InvoiceStatus.Issued
            and not InvoiceStatus.Paid
            and not InvoiceStatus.PartiallyPaid
            and not InvoiceStatus.Cancelled)
        {
            throw new BadRequestException("Invalid invoice status.");
        }
    }

    private static string NormalizeCurrency(string? value)
    {
        var currency = string.IsNullOrWhiteSpace(value)
            ? "EUR"
            : value.Trim().ToUpperInvariant();

        if (currency.Length != 3)
            throw new BadRequestException("Currency must be a 3-letter code.");

        return currency;
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

    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        return exception.InnerException is SqlException { Number: 2601 or 2627 };
    }

    private static bool IsForeignKeyViolation(DbUpdateException exception)
    {
        return exception.InnerException is SqlException { Number: 547 };
    }
}
