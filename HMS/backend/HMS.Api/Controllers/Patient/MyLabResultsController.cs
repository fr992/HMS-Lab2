using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/lab-results")]
public sealed class MyLabResultsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Own.LabResults.View")]
    public IActionResult List()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpGet("{id:int}/download")]
    [RequirePermission("Own.LabResults.Download")]
    public IActionResult DownloadPdf(int id)
    {
        return Ok(new { id, note = "PDF download not implemented yet." });
    }
}