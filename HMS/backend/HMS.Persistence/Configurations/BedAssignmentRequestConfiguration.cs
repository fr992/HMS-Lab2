using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class BedAssignmentRequestConfiguration : IEntityTypeConfiguration<BedAssignmentRequest>
{
    public void Configure(EntityTypeBuilder<BedAssignmentRequest> builder)
    {
        builder.ToTable("BedAssignmentRequests");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Priority)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.Property(x => x.PreferredWard)
            .HasMaxLength(100);

        builder.Property(x => x.RequestedAt)
            .IsRequired();

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PatientProfile)
            .WithMany()
            .HasForeignKey(x => x.PatientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RequestedByDoctor)
            .WithMany()
            .HasForeignKey(x => x.RequestedByDoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ResolvedByUser)
            .WithMany()
            .HasForeignKey(x => x.ResolvedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.BedAssignment)
            .WithMany()
            .HasForeignKey(x => x.BedAssignmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.EncounterId, x.PatientProfileId })
            .IsUnique()
            .HasFilter("[Status] = 'Pending'");

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.RequestedAt);
        builder.HasIndex(x => x.ResolvedAt);
        builder.HasIndex(x => x.BedAssignmentId);
    }
}
