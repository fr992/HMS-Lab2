using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class StaffProfileConfiguration : IEntityTypeConfiguration<StaffProfile>
{
    public void Configure(EntityTypeBuilder<StaffProfile> builder)
    {
        builder.ToTable("StaffProfile");

        builder.HasIndex(x => x.PersonId)
            .IsUnique();

        builder.HasOne(x => x.Department)
            .WithMany(x => x.StaffProfiles)
            .HasForeignKey(x => x.DepartmentId);

        builder.HasOne(x => x.Person)
            .WithOne(x => x.StaffProfile)
            .HasForeignKey<StaffProfile>(x => x.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
