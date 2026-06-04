using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class NurseTaskConfiguration : IEntityTypeConfiguration<NurseTask>
{
    public void Configure(EntityTypeBuilder<NurseTask> builder)
    {
        builder.ToTable("NurseTasks");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.Priority)
            .HasMaxLength(50);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired();

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AssignedByDoctor)
            .WithMany()
            .HasForeignKey(x => x.AssignedByDoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AssignedToNurse)
            .WithMany()
            .HasForeignKey(x => x.AssignedToNurseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.CompletedByUser)
            .WithMany()
            .HasForeignKey(x => x.CompletedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.EncounterId);
        builder.HasIndex(x => x.AssignedByDoctorId);
        builder.HasIndex(x => x.AssignedToNurseId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.DueAt);
        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        builder.HasIndex(x => new { x.Status, x.DueAt });
    }
}
