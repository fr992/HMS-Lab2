using HMS.Api.Controllers.Reception;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class PaymentsControllerTests
{
    private readonly Mock<IPaymentService> _paymentService = new();
    private readonly PaymentsController _controller;

    public PaymentsControllerTests()
    {
        _controller = new PaymentsController(_paymentService.Object);
        ControllerTestHelper.SetUser(_controller, userId: 72, permissions: ["Payments.Read"]);
    }

    [Fact]
    public async Task GetById_ReturnsPaymentFromService()
    {
        var payment = new PaymentDto { Id = 11, InvoiceId = 7 };
        _paymentService
            .Setup(service => service.GetByIdAsync(11, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await _controller.GetById(11, CancellationToken.None);

        Assert.Same(payment, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task List_ForwardsQueryToService()
    {
        var query = new PaymentListQueryDto { Page = 3, PageSize = 25, Status = "Completed" };
        var response = PaginatedResponse<PaymentDto>.Create(
            [new PaymentDto { Id = 12, Status = "Completed" }],
            page: 3,
            pageSize: 25,
            totalCount: 51);
        _paymentService
            .Setup(service => service.ListAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _controller.List(query, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task Create_PassesCurrentUserAndReturnsCreatedPayment()
    {
        var request = new CreatePaymentDto { InvoiceId = 22, Amount = 125, PaymentMethod = "Cash" };
        var payment = new PaymentDto { Id = 13, InvoiceId = request.InvoiceId, Amount = request.Amount };
        _paymentService
            .Setup(service => service.CreateAsync(request, 72, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await _controller.Create(request, CancellationToken.None);

        Assert.Same(payment, ControllerTestHelper.AssertCreatedValue(result, nameof(PaymentsController.GetById)));
    }

    [Fact]
    public async Task UpdateStatus_PassesCurrentUserAndReturnsPayment()
    {
        var request = new UpdatePaymentStatusDto { Status = "Completed" };
        var payment = new PaymentDto { Id = 14, Status = request.Status };
        _paymentService
            .Setup(service => service.UpdateStatusAsync(14, request, 72, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await _controller.UpdateStatus(14, request, CancellationToken.None);

        Assert.Same(payment, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task ConfirmCash_PassesCurrentUserAndReturnsPayment()
    {
        var payment = new PaymentDto { Id = 15, Status = "Completed", PaymentMethod = "Cash" };
        _paymentService
            .Setup(service => service.ConfirmCashAsync(15, 72, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await _controller.ConfirmCash(15, CancellationToken.None);

        Assert.Same(payment, ControllerTestHelper.AssertOkValue(result));
    }
}
