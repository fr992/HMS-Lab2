using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/invoices")]
public sealed class MyInvoicesController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Own.Invoices.View")]
    public IActionResult List()
    {
        return Ok(Array.Empty<object>());
    }
}