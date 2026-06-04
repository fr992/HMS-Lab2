using HMS.Api.Controllers.Patient;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class PatientPortalControllerTests
{
    [Fact]
    public async Task MyInvoices_List_PassesCurrentPatientUser()
    {
        var service = new Mock<IInvoiceService>();
        var controller = new MyInvoicesController(service.Object);
        var pagination = new PaginationQuery { Page = 1, PageSize = 25 };
        var response = PaginatedResponse<InvoiceDto>.Create([], 1, 25, 0);
        ControllerTestHelper.SetUser(controller, userId: 44, permissions: ["Own.Invoices.View"]);
        service
            .Setup(s => s.ListForPatientUserAsync(44, pagination, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await controller.List(pagination, CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task MyPayments_PayOnline_PassesCurrentPatientUserAndReturnsUrl()
    {
        var service = new Mock<IStripeService>();
        var controller = new MyPaymentsController(service.Object);
        ControllerTestHelper.SetUser(controller, userId: 45, permissions: ["Own.Payments.PayOnline"]);
        service
            .Setup(s => s.CreatePatientCheckoutSessionAsync(9, 45, It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://checkout.example.test/session");

        var result = await controller.PayOnline(new CreateStripeCheckoutDto { InvoiceId = 9 }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("checkout.example.test", ok.Value!.ToString());
    }

    [Fact]
    public void MyMedicalHistory_Get_ReturnsEmptyHistoryPlaceholder()
    {
        var controller = new MyMedicalHistoryController();

        var result = controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Empty(Assert.IsAssignableFrom<object[]>(ok.Value));
    }
}
