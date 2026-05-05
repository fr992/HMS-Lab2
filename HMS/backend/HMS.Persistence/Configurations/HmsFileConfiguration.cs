using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class HmsFileConfiguration : IEntityTypeConfiguration<HmsFile>
{
    public void Configure(EntityTypeBuilder<HmsFile> builder)
    {
        builder.ToTable("Files");

        builder.HasKey(file => file.Id);

        builder.Property(file => file.OriginalFileName)
            .IsRequired()
            .HasMaxLength(260);

        builder.Property(file => file.StoredFileName)
            .IsRequired()
            .HasMaxLength(260);

        builder.Property(file => file.ContentType)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(file => file.StoragePath)
            .IsRequired()
            .HasMaxLength(500);

        builder.HasIndex(file => file.StoredFileName)
            .IsUnique();
    }
}
