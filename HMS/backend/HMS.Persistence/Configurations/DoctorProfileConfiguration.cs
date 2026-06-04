using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public class DoctorProfileConfiguration : IEntityTypeConfiguration<DoctorProfile>
{
    public void Configure(EntityTypeBuilder<DoctorProfile> builder)
    {
        builder.HasOne(d => d.StaffProfile)
            .WithOne(s => s.DoctorProfile)
            .HasForeignKey<DoctorProfile>(d => d.StaffProfileId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(d => d.StaffProfileId)
            .IsUnique();

        builder.HasIndex(d => new { d.IsActive, d.StaffProfileId });
    }
}
