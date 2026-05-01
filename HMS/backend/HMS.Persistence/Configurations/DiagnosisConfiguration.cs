using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class DiagnosisConfiguration : IEntityTypeConfiguration<Diagnosis>
{
    public void Configure(EntityTypeBuilder<Diagnosis> builder)
    {
        builder.ToTable("Diagnoses");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.IcdCode)
            .HasMaxLength(30);

        builder.Property(d => d.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(d => d.Type)
            .HasMaxLength(50);

        builder.Property(d => d.Notes)
            .HasMaxLength(2000);

        builder.HasIndex(d => d.EncounterId);
        builder.HasIndex(d => d.CreatedByDoctorId);
        builder.HasIndex(d => d.IcdCode);

        builder.HasOne(d => d.Encounter)
            .WithMany(e => e.Diagnoses)
            .HasForeignKey(d => d.EncounterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.CreatedByDoctor)
            .WithMany()
            .HasForeignKey(d => d.CreatedByDoctorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
