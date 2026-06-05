using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Identity.Domain.Entities;
using Identity.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class SettingsService : ISettingsService
{
    private readonly IRepository<Setting> _settings;
    private readonly IUnitOfWork _unitOfWork;

    public SettingsService(
        IRepository<Setting> settings,
        IUnitOfWork unitOfWork)
    {
        _settings = settings;
        _unitOfWork = unitOfWork;
    }

    public async Task<SettingDto> CreateAsync(
        CreateSettingDto request,
        CancellationToken cancellationToken)
    {
        var key = NormalizeRequired(request.Key, "Key is required.");
        var value = NormalizeRequired(request.Value, "Value is required.");

        var exists = await _settings.AnyAsync(
            setting => setting.Key == key,
            cancellationToken);

        if (exists)
            throw new ConflictException("Setting key already exists.");

        var setting = new Setting
        {
            Key = key,
            Value = value,
            Description = NormalizeOptional(request.Description),
            UpdatedAt = DateTime.UtcNow
        };

        await _settings.AddAsync(setting, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(setting);
    }

    public async Task<SettingDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _settings.Query()
            .Where(setting => setting.Id == id)
            .Select(setting => new SettingDto
            {
                Id = setting.Id,
                Key = setting.Key,
                Value = setting.Value,
                Description = setting.Description,
                UpdatedAt = setting.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<string?> GetValueAsync(
        string key,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var normalizedKey = key.Trim();

        return await _settings.Query()
            .Where(setting => setting.Key == normalizedKey)
            .Select(setting => setting.Value)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<PaginatedResponse<SettingDto>> GetAllAsync(
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = _settings.Query();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(setting =>
                setting.Key.Contains(search)
                || (setting.Description != null && setting.Description.Contains(search)));
        }

        return await query
            .OrderBy(setting => setting.Key)
            .Select(setting => new SettingDto
            {
                Id = setting.Id,
                Key = setting.Key,
                Value = setting.Value,
                Description = setting.Description,
                UpdatedAt = setting.UpdatedAt
            })
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<SettingDto> UpdateAsync(
        int id,
        UpdateSettingDto request,
        CancellationToken cancellationToken)
    {
        var setting = await _settings.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (setting == null)
            throw new NotFoundException("Setting not found.");

        var key = NormalizeRequired(request.Key, "Key is required.");
        var value = NormalizeRequired(request.Value, "Value is required.");

        var exists = await _settings.AnyAsync(
            item => item.Id != id && item.Key == key,
            cancellationToken);

        if (exists)
            throw new ConflictException("Setting key already exists.");

        setting.Key = key;
        setting.Value = value;
        setting.Description = NormalizeOptional(request.Description);
        setting.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(setting);
    }

    public async Task DeleteAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var setting = await _settings.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (setting == null)
            throw new NotFoundException("Setting not found.");

        _settings.Remove(setting);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeRequired(string value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new BadRequestException(message);

        return value.Trim();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static SettingDto Map(Setting setting)
    {
        return new SettingDto
        {
            Id = setting.Id,
            Key = setting.Key,
            Value = setting.Value,
            Description = setting.Description,
            UpdatedAt = setting.UpdatedAt
        };
    }
}
