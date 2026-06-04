using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class LabRequestConfiguration : IEntityTypeConfiguration<LabRequest>
{
    public void Configure(EntityTypeBuilder<LabRequest> builder)
    {
        builder.ToTable("LabRequests");

        builder.HasKey(lr => lr.Id);

        builder.Property(lr => lr.RequestNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(lr => lr.RequestNumber)
            .IsUnique();

        builder.Property(lr => lr.Priority)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(lr => lr.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(lr => lr.ClinicalNotes)
            .HasMaxLength(2000);

        builder.HasIndex(lr => lr.EncounterId);
        builder.HasIndex(lr => lr.RequestedByDoctorId);
        builder.HasIndex(lr => lr.Status);
        builder.HasIndex(lr => lr.RequestedAt);
        builder.HasIndex(lr => new { lr.Status, lr.RequestedAt });
        builder.HasIndex(lr => new { lr.EncounterId, lr.RequestedAt });
        builder.HasIndex(lr => new { lr.RequestedByDoctorId, lr.RequestedAt });

        builder.HasOne(lr => lr.Encounter)
            .WithMany(e => e.LabRequests)
            .HasForeignKey(lr => lr.EncounterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(lr => lr.RequestedByDoctor)
            .WithMany()
            .HasForeignKey(lr => lr.RequestedByDoctorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
