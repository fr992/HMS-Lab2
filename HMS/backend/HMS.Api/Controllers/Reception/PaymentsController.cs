using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    [HttpPost("confirm-cash")]
    [RequirePermission("Payments.ConfirmCash")]
    public IActionResult ConfirmCash([FromBody] object? request)
    {
        return Ok(new { confirmed = false, note = "Payments module not implemented yet." });
    }
}