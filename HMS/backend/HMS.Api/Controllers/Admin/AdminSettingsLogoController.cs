using HMS.Api.Authorization;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/settings/logo")]
public sealed class AdminSettingsLogoController : ControllerBase
{
    private static readonly HashSet<string> AllowedLogoContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    };

    private const long MaxLogoBytes = 2 * 1024 * 1024;
    private const string LogoSettingKey = "hospital.logoUrl";

    private readonly HmsDbContext _db;
    private readonly IWebHostEnvironment _environment;

    public AdminSettingsLogoController(HmsDbContext db, IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    [HttpPost]
    [RequestSizeLimit(MaxLogoBytes + 1024 * 1024)]
    [RequirePermission("Settings.Manage")]
    public async Task<ActionResult<SettingDto>> Upload(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            throw new BadRequestException("Logo image is required.");

        if (file.Length > MaxLogoBytes)
            throw new BadRequestException("Logo image cannot be larger than 2 MB.");

        if (!AllowedLogoContentTypes.Contains(file.ContentType))
            throw new BadRequestException("Logo must be a PNG, JPG, WebP, or GIF image.");

        var extension = Path.GetExtension(file.FileName);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var folder = LogoFolder();
        Directory.CreateDirectory(folder);

        var fullPath = Path.Combine(folder, storedFileName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var logoUrl = $"{Request.Scheme}://{Request.Host}/api/public/settings/logo/{storedFileName}";
        var setting = await _db.Settings.FirstOrDefaultAsync(item => item.Key == LogoSettingKey, cancellationToken);

        if (setting is null)
        {
            setting = new Setting
            {
                Key = LogoSettingKey,
                Value = logoUrl,
                Description = "Public hospital logo URL.",
                UpdatedAt = DateTime.UtcNow
            };
            _db.Settings.Add(setting);
        }
        else
        {
            setting.Value = logoUrl;
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new SettingDto
        {
            Id = setting.Id,
            Key = setting.Key,
            Value = setting.Value,
            Description = setting.Description,
            UpdatedAt = setting.UpdatedAt
        });
    }

    private string LogoFolder()
    {
        return Path.Combine(_environment.ContentRootPath, "App_Data", "Branding");
    }
}
