using System.Linq.Expressions;

namespace HMS.Application.Abstractions.Persistence;

public interface IHmsRepository
{
    IQueryable<TEntity> Query<TEntity>()
        where TEntity : class;

    IQueryable<TEntity> Query<TEntity>(bool asNoTracking = true)
        where TEntity : class;

    Task<TEntity?> GetByIdAsync<TEntity>(
        int id,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default)
        where TEntity : class;

    Task<TEntity?> FirstOrDefaultAsync<TEntity>(
        Expression<Func<TEntity, bool>> predicate,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default)
        where TEntity : class;

    Task<bool> AnyAsync<TEntity>(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default)
        where TEntity : class;

    Task AddAsync<TEntity>(
        TEntity entity,
        CancellationToken cancellationToken = default)
        where TEntity : class;

    void Add<TEntity>(TEntity entity)
        where TEntity : class;

    Task AddRangeAsync<TEntity>(
        IEnumerable<TEntity> entities,
        CancellationToken cancellationToken = default)
        where TEntity : class;

    void AddRange<TEntity>(IEnumerable<TEntity> entities)
        where TEntity : class;

    void Remove<TEntity>(TEntity entity)
        where TEntity : class;

    void RemoveRange<TEntity>(IEnumerable<TEntity> entities)
        where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
