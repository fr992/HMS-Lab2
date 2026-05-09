using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class BedConfiguration : IEntityTypeConfiguration<Bed>
{
    public void Configure(EntityTypeBuilder<Bed> builder)
    {
        builder.ToTable("Beds");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Ward)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.RoomNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.BedNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Floor)
            .HasMaxLength(50);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.Ward, x.RoomNumber, x.BedNumber })
            .IsUnique();

        builder.HasIndex(x => x.DepartmentId);
        builder.HasIndex(x => x.IsActive);
    }
}
