using System.Linq.Expressions;
using HMS.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HMS.Persistence.Repositories;

public class EfRepository<TEntity> : IRepository<TEntity>
    where TEntity : class
{
    private readonly HmsDbContext _db;

    public EfRepository(HmsDbContext db)
    {
        _db = db;
    }

    public IQueryable<TEntity> Query(bool asNoTracking = true)
    {
        var query = _db.Set<TEntity>().AsQueryable();

        return asNoTracking
            ? query.AsNoTracking()
            : query;
    }

    public async Task<TEntity?> GetByIdAsync(
        int id,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default)
    {
        return await Query(asNoTracking)
            .FirstOrDefaultAsync(entity => EF.Property<int>(entity, "Id") == id, cancellationToken);
    }

    public async Task<TEntity?> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool asNoTracking = true,
        CancellationToken cancellationToken = default)
    {
        return await Query(asNoTracking)
            .FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public async Task<bool> AnyAsync(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        return await _db.Set<TEntity>()
            .AnyAsync(predicate, cancellationToken);
    }

    public async Task AddAsync(
        TEntity entity,
        CancellationToken cancellationToken = default)
    {
        await _db.Set<TEntity>().AddAsync(entity, cancellationToken);
    }

    public void Remove(TEntity entity)
    {
        _db.Set<TEntity>().Remove(entity);
    }
}
