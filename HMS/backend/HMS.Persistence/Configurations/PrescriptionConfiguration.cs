using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
{
    public void Configure(EntityTypeBuilder<Prescription> builder)
    {
        builder.ToTable("Prescriptions");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Notes)
            .HasMaxLength(1000);

        builder.Property(p => p.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasOne(p => p.Encounter)
            .WithMany()
            .HasForeignKey(p => p.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.PrescribedByDoctor)
            .WithMany()
            .HasForeignKey(p => p.PrescribedByDoctorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}