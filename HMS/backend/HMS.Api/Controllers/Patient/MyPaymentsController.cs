using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/payments")]
public sealed class MyPaymentsController : ControllerBase
{
    [HttpPost("pay-online")]
    [RequirePermission("Own.Payments.PayOnline")]
    public IActionResult PayOnline([FromBody] object? request)
    {
        return Ok(new { paid = false, note = "Online payments not implemented yet." });
    }
}