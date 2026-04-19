using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/invoices")]
public sealed class ReceptionInvoicesController : ControllerBase
{
    [HttpGet("{id:int}")]
    [RequirePermission("Invoices.Read")]
    public IActionResult GetById(int id)
    {
        return Ok(new { id, found = false, note = "Invoices module not implemented yet." });
    }

    [HttpGet]
    [RequirePermission("Invoices.Read")]
    public IActionResult List([FromQuery] int? patientId)
    {
        return Ok(Array.Empty<object>());
    }
}