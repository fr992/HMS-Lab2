using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class PrescriptionItemConfiguration : IEntityTypeConfiguration<PrescriptionItem>
{
    public void Configure(EntityTypeBuilder<PrescriptionItem> builder)
    {
        builder.ToTable("PrescriptionItems");

        builder.HasKey(pi => pi.Id);

        builder.Property(pi => pi.Dosage)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pi => pi.Unit)
            .HasMaxLength(50);

        builder.Property(pi => pi.Frequency)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pi => pi.Duration)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pi => pi.Route)
            .HasMaxLength(100);

        builder.Property(pi => pi.Instructions)
            .HasMaxLength(1000);

        builder.HasOne(pi => pi.Prescription)
            .WithMany(p => p.Items)
            .HasForeignKey(pi => pi.PrescriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        //builder.HasOne(pi => pi.Medication)
           // .WithMany()
           // .HasForeignKey(pi => pi.MedicationId)
           // .OnDelete(DeleteBehavior.Restrict);
    }
}