using HMS.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/settings")]
public sealed class PublicSettingsController : ControllerBase
{
    private static readonly string[] PublicSettingKeys =
    [
        "hospital.name",
        "hospital.logoUrl",
        "hospital.email",
        "hospital.phone",
        "hospital.address",
        "hospital.emergencyPhone",
        "hospital.workingHours",
        "landing.heroTitle",
        "landing.heroSubtitle",
        "landing.aboutText",
        "landing.emergencyContactText",
        "landing.footerText"
    ];

    private readonly HmsDbContext _db;
    private readonly IWebHostEnvironment _environment;

    public PublicSettingsController(HmsDbContext db, IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyDictionary<string, string>>> Get(CancellationToken cancellationToken)
    {
        var settings = await _db.Settings
            .AsNoTracking()
            .Where(setting => PublicSettingKeys.Contains(setting.Key))
            .OrderBy(setting => setting.Key)
            .ToDictionaryAsync(setting => setting.Key, setting => setting.Value, cancellationToken);

        return Ok(settings);
    }

    [HttpGet("logo/{storedFileName}")]
    public IActionResult GetLogo(string storedFileName)
    {
        var safeFileName = Path.GetFileName(storedFileName);
        if (!string.Equals(safeFileName, storedFileName, StringComparison.Ordinal))
            return BadRequest();

        var fullPath = Path.Combine(_environment.ContentRootPath, "App_Data", "Branding", safeFileName);
        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            _ => "application/octet-stream"
        };

        return PhysicalFile(fullPath, contentType);
    }
}
