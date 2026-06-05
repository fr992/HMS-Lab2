using System.Linq.Expressions;
using HMS.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HMS.Persistence.Repositories;

public sealed class EfHmsRepository : IHmsRepository
{
    private readonly HmsDbContext _db;

    public EfHmsRepository(HmsDbContext db)
    {
        _db = db;
    }

    public IQueryable<TEntity> Query<TEntity>()
        where TEntity : class
    {
        return Query<TEntity>(asNoTracking: false);
    }

    public IQueryable<TEntity> Query<TEntity>(bool asNoTracking = true)
        where TEntity : class
    {
        var query = _db.Set<TEntity>().AsQueryable();

        return asNoTracking
            ? query.AsNoTracking()
            : query;
    }

    public async Task<TEntity?> GetByIdAsync<TEntity>(
        int id,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default)
        where TEntity : class
    {
        return await Query<TEntity>(asNoTracking)
            .FirstOrDefaultAsync(entity => EF.Property<int>(entity, "Id") == id, cancellationToken);
    }

    public async Task<TEntity?> FirstOrDefaultAsync<TEntity>(
        Expression<Func<TEntity, bool>> predicate,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default)
        where TEntity : class
    {
        return await Query<TEntity>(asNoTracking)
            .FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public async Task<bool> AnyAsync<TEntity>(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default)
        where TEntity : class
    {
        return await _db.Set<TEntity>()
            .AnyAsync(predicate, cancellationToken);
    }

    public async Task AddAsync<TEntity>(
        TEntity entity,
        CancellationToken cancellationToken = default)
        where TEntity : class
    {
        await _db.Set<TEntity>().AddAsync(entity, cancellationToken);
    }

    public void Add<TEntity>(TEntity entity)
        where TEntity : class
    {
        _db.Set<TEntity>().Add(entity);
    }

    public async Task AddRangeAsync<TEntity>(
        IEnumerable<TEntity> entities,
        CancellationToken cancellationToken = default)
        where TEntity : class
    {
        await _db.Set<TEntity>().AddRangeAsync(entities, cancellationToken);
    }

    public void AddRange<TEntity>(IEnumerable<TEntity> entities)
        where TEntity : class
    {
        _db.Set<TEntity>().AddRange(entities);
    }

    public void Remove<TEntity>(TEntity entity)
        where TEntity : class
    {
        _db.Set<TEntity>().Remove(entity);
    }

    public void RemoveRange<TEntity>(IEnumerable<TEntity> entities)
        where TEntity : class
    {
        _db.Set<TEntity>().RemoveRange(entities);
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
