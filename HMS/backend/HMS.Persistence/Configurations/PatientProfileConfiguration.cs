using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class PatientProfileConfiguration : IEntityTypeConfiguration<PatientProfile>
{
    public void Configure(EntityTypeBuilder<PatientProfile> builder)
    {
        builder.HasIndex(p => p.PatientNumber).IsUnique();

        builder.Property(p => p.PatientNumber)
            .IsRequired()
            .HasMaxLength(32);
    }
}
