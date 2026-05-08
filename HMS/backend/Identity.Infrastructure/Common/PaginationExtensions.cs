using HMS.Contracts.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Common;

public static class PaginationExtensions
{
    public static async Task<PaginatedResponse<T>> ToPaginatedResponseAsync<T>(
        this IQueryable<T> query,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var page = pagination.Page;
        var pageSize = pagination.PageSize;
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return PaginatedResponse<T>.Create(items, page, pageSize, totalCount);
    }
}
