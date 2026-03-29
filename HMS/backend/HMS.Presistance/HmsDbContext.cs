using Microsoft.EntityFrameworkCore;
using Identity.Domain.Entities;

namespace HMS.Persistance; 

public class HmsDbContext : DbContext
{
    public HmsDbContext(DbContextOptions<HmsDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HmsDbContext).Assembly);
    }
}