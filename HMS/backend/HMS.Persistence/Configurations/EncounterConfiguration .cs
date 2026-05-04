using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class EncounterConfiguration : IEntityTypeConfiguration<Encounter>
{
    public void Configure(EntityTypeBuilder<Encounter> builder)
    {
        builder.ToTable("Encounters");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.EncounterNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(e => e.EncounterNumber)
            .IsUnique();

        builder.HasIndex(e => e.StartedAt);

        builder.HasIndex(e => new { e.DoctorProfileId, e.StartedAt });

        builder.HasIndex(e => new { e.PatientProfileId, e.StartedAt });

        builder.HasIndex(e => e.AppointmentId)
            .IsUnique()
            .HasFilter("[AppointmentId] IS NOT NULL");

        builder.Property(e => e.EncounterType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.Notes)
            .HasMaxLength(2000);

        // Relationships
        builder.HasOne(e => e.PatientProfile)
            .WithMany()
            .HasForeignKey(e => e.PatientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.DoctorProfile)
            .WithMany()
            .HasForeignKey(e => e.DoctorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Appointment)
            .WithOne()
            .HasForeignKey<Encounter>(e => e.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
