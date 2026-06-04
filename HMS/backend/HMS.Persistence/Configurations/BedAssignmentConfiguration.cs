using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class BedAssignmentConfiguration : IEntityTypeConfiguration<BedAssignment>
{
    public void Configure(EntityTypeBuilder<BedAssignment> builder)
    {
        builder.ToTable("BedAssignments");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.Property(x => x.ReleaseNotes)
            .HasMaxLength(1000);

        builder.Property(x => x.AssignedAt)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired();

        builder.HasOne(x => x.Bed)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.BedId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PatientProfile)
            .WithMany()
            .HasForeignKey(x => x.PatientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.AssignedByUser)
            .WithMany()
            .HasForeignKey(x => x.AssignedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReleasedByUser)
            .WithMany()
            .HasForeignKey(x => x.ReleasedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.BedId)
            .IsUnique()
            .HasFilter("[ReleasedAt] IS NULL");

        builder.HasIndex(x => x.PatientProfileId)
            .IsUnique()
            .HasFilter("[ReleasedAt] IS NULL");

        builder.HasIndex(x => x.EncounterId);
        builder.HasIndex(x => x.AssignedAt);
        builder.HasIndex(x => x.ReleasedAt);
        builder.HasIndex(x => new { x.PatientProfileId, x.ReleasedAt });
        builder.HasIndex(x => new { x.BedId, x.ReleasedAt });
    }
}
