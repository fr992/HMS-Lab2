using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Presistance.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Action).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Entity).IsRequired().HasMaxLength(200);
        builder.Property(x => x.IpAddress).HasMaxLength(64);

        builder.HasOne(x => x.User)
            .WithMany(x => x.AuditLogs)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => new { x.Entity, x.EntityId });
    }
}