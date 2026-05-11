using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class SettingConfiguration : IEntityTypeConfiguration<Setting>
{
    public void Configure(EntityTypeBuilder<Setting> builder)
    {
        builder.ToTable("settings");

        builder.HasKey(setting => setting.Id);

        builder.Property(setting => setting.Key)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(setting => setting.Value)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(setting => setting.Description)
            .HasMaxLength(1000);

        builder.Property(setting => setting.UpdatedAt)
            .IsRequired();

        builder.HasIndex(setting => setting.Key)
            .IsUnique();
    }
}
