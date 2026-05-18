using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Examples;

[ApiController]
[Route("api/examples/logging")]
[ApiExplorerSettings(IgnoreApi = true)]
public sealed class LoggingExamplesController : ControllerBase
{
    private readonly ILogger<LoggingExamplesController> _logger;

    public LoggingExamplesController(ILogger<LoggingExamplesController> logger)
    {
        _logger = logger;
    }

    [HttpPost("appointments/booked")]
    public IActionResult PatientAppointmentBooked(BookAppointmentLogExampleRequest request)
    {
        using var scope = BeginAuditScope("PatientAppointmentBooked", request.PatientId);

        _logger.LogInformation(
            "Patient appointment booked for patient {PatientId} with doctor {DoctorId} at {AppointmentStart}.",
            request.PatientId,
            request.DoctorId,
            request.AppointmentStart);

        return Accepted();
    }

    [HttpPost("medicines/low-stock")]
    public IActionResult LowMedicineStock(LowMedicineStockLogExampleRequest request)
    {
        using var scope = BeginAuditScope("LowMedicineStock", null);

        _logger.LogWarning(
            "Low medicine stock alert for medication {MedicationId} ({MedicationName}). Quantity on hand: {QuantityOnHand}; reorder threshold: {ReorderThreshold}.",
            request.MedicationId,
            request.MedicationName,
            request.QuantityOnHand,
            request.ReorderThreshold);

        return Accepted();
    }

    [HttpPost("payments/failed")]
    public IActionResult FailedPayment(FailedPaymentLogExampleRequest request)
    {
        using var scope = BeginAuditScope("FailedPayment", request.PatientId);
        var paymentException = new InvalidOperationException(request.FailureReason);

        _logger.LogError(
            paymentException,
            "Payment {PaymentId} failed for patient {PatientId}. Amount: {Amount}.",
            request.PaymentId,
            request.PatientId,
            request.Amount);

        return Accepted();
    }

    [HttpPost("patient-records/unauthorized-access")]
    public IActionResult UnauthorizedPatientRecordAccess(UnauthorizedPatientRecordAccessLogExampleRequest request)
    {
        using var scope = BeginAuditScope("UnauthorizedPatientRecordAccess", request.PatientId);

        _logger.LogCritical(
            "Unauthorized access attempt on patient record {PatientId}. Attempted action: {AttemptedAction}.",
            request.PatientId,
            request.AttemptedAction);

        return Accepted();
    }

    private IDisposable? BeginAuditScope(string auditScenario, int? patientId)
    {
        return _logger.BeginScope(new Dictionary<string, object?>
        {
            ["AuditScenario"] = auditScenario,
            ["ActorUserId"] = CurrentUserId(),
            ["PatientId"] = patientId,
            ["RemoteIpAddress"] = HttpContext.Connection.RemoteIpAddress?.ToString(),
            ["TraceId"] = HttpContext.TraceIdentifier
        });
    }

    private string CurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? "anonymous";
    }
}

public sealed record BookAppointmentLogExampleRequest(
    int PatientId,
    int DoctorId,
    DateTimeOffset AppointmentStart);

public sealed record LowMedicineStockLogExampleRequest(
    int MedicationId,
    string MedicationName,
    int QuantityOnHand,
    int ReorderThreshold);

public sealed record FailedPaymentLogExampleRequest(
    int PaymentId,
    int PatientId,
    decimal Amount,
    string FailureReason);

public sealed record UnauthorizedPatientRecordAccessLogExampleRequest(
    int PatientId,
    string AttemptedAction);
