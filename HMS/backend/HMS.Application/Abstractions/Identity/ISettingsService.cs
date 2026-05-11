using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface ISettingsService
{
    Task<SettingDto> CreateAsync(
        CreateSettingDto request,
        CancellationToken cancellationToken);

    Task<SettingDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<PaginatedResponse<SettingDto>> GetAllAsync(
        PaginationQuery pagination,
        CancellationToken cancellationToken);

    Task<SettingDto> UpdateAsync(
        int id,
        UpdateSettingDto request,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        int id,
        CancellationToken cancellationToken);
}
