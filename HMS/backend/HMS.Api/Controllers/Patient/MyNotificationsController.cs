using HMS.Api.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Patient;

[ApiController]
[Route("api/me/notifications")]
public sealed class MyNotificationsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("Own.Notifications.View")]
    public IActionResult List()
    {
        return Ok(Array.Empty<object>());
    }
}