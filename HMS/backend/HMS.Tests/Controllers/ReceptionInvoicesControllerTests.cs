using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class ReceptionInvoicesControllerTests
{
    private readonly Mock<IInvoiceService> _invoiceService = new();
    private readonly ReceptionInvoicesController _controller;

    public ReceptionInvoicesControllerTests()
    {
        _controller = new ReceptionInvoicesController(_invoiceService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 64, permissions: ["Invoices.Read"]);
    }

    [Fact]
    public async Task GetById_ReturnsInvoiceFromService()
    {
        var invoice = new InvoiceDto { Id = 10, InvoiceNumber = "INV-10" };
        _invoiceService
            .Setup(service => service.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var result = await _controller.GetById(10, CancellationToken.None);

        Assert.Same(invoice, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task List_ForwardsFiltersAndPagination()
    {
        var pagination = new PaginationQuery { Page = 2, PageSize = 25 };
        var response = PaginatedResponse<InvoiceDto>.Create(
            [new InvoiceDto { Id = 20, Status = "Issued" }],
            page: 2,
            pageSize: 25,
            totalCount: 26);
        _invoiceService
            .Setup(service => service.ListAsync(5, "Issued", pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.List(5, "Issued", pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Create_PassesCurrentUserAndReturnsCreatedInvoice()
    {
        var request = new CreateInvoiceDto { PatientProfileId = 9, Currency = "EUR" };
        var invoice = new InvoiceDto { Id = 30, PatientProfileId = request.PatientProfileId };
        _invoiceService
            .Setup(service => service.CreateAsync(request, 64, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(invoice, ControllerTestHelper.AssertCreatedValue(result, nameof(ReceptionInvoicesController.GetById)));
    }

    [Fact]
    public async Task UpdateStatus_PassesCurrentUserAndReturnsInvoice()
    {
        var request = new UpdateInvoiceStatusDto { Status = "Paid" };
        var invoice = new InvoiceDto { Id = 40, Status = request.Status };
        _invoiceService
            .Setup(service => service.UpdateStatusAsync(40, request, 64, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var result = await _controller.UpdateStatus(40, request, CancellationToken.None);

        Assert.Same(invoice, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Cancel_PassesCurrentUserAndReturnsInvoice()
    {
        var invoice = new InvoiceDto { Id = 50, Status = "Cancelled" };
        _invoiceService
            .Setup(service => service.CancelAsync(50, 64, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var result = await _controller.Cancel(50, CancellationToken.None);

        Assert.Same(invoice, ControllerTestHelper.AssertOkValue(result));
    }
}
