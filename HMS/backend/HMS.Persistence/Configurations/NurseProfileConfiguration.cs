using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class NurseProfileConfiguration : IEntityTypeConfiguration<NurseProfile>
{
    public void Configure(EntityTypeBuilder<NurseProfile> builder)
    {
        builder.ToTable("NurseProfiles");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.LicenseNumber)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired();

        builder.HasOne(x => x.StaffProfile)
            .WithOne(x => x.NurseProfile)
            .HasForeignKey<NurseProfile>(x => x.StaffProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.StaffProfileId)
            .IsUnique();

        builder.HasIndex(x => x.LicenseNumber)
            .IsUnique();
    }
}
