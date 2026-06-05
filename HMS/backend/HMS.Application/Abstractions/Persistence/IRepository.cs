using System.Linq.Expressions;

namespace HMS.Application.Abstractions.Persistence;

public interface IRepository<TEntity>
    where TEntity : class
{
    IQueryable<TEntity> Query(bool asNoTracking = true);

    Task<TEntity?> GetByIdAsync(
        int id,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default);

    Task<TEntity?> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default);

    Task<bool> AnyAsync(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        TEntity entity,
        CancellationToken cancellationToken = default);

    void Remove(TEntity entity);
}
