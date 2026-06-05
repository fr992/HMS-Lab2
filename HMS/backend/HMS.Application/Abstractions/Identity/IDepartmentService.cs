using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IDepartmentService
{
    Task<PaginatedResponse<DepartmentDto>> GetDepartmentsAsync(
        PaginationQuery pagination,
        bool all,
        CancellationToken cancellationToken);

    Task<DepartmentDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken);

    Task<DepartmentDto> CreateAsync(
        CreateDepartmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<DepartmentDto?> UpdateAsync(
        int id,
        UpdateDepartmentDto request,
        int? actorUserId,
        CancellationToken cancellationToken);

    Task<DeleteDepartmentResult> DeleteAsync(
        int id,
        CancellationToken cancellationToken);
}

public enum DeleteDepartmentResult
{
    Deleted,
    NotFound,
    InUse
}
