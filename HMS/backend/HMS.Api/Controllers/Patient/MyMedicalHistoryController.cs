using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/medical-history")]
public sealed class MyMedicalHistoryController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Own.MedicalHistory.View")]
    public IActionResult Get()
    {
        return Ok(Array.Empty<object>());
    }
}