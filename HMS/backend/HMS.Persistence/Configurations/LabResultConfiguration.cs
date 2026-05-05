using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class LabResultConfiguration : IEntityTypeConfiguration<LabResult>
{
    public void Configure(EntityTypeBuilder<LabResult> builder)
    {
        builder.ToTable("LabResults");

        builder.HasKey(lr => lr.Id);

        builder.Property(lr => lr.ResultValue)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(lr => lr.Unit)
            .HasMaxLength(100);

        builder.Property(lr => lr.ReferenceRange)
            .HasMaxLength(200);

        builder.Property(lr => lr.Interpretation)
            .HasMaxLength(200);

        builder.Property(lr => lr.Notes)
            .HasMaxLength(2000);

        builder.Property(lr => lr.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(lr => lr.AttachmentFileName)
            .HasMaxLength(260);

        builder.Property(lr => lr.AttachmentContentType)
            .HasMaxLength(120);

        builder.Property(lr => lr.AttachmentStoragePath)
            .HasMaxLength(500);

        builder.HasIndex(lr => lr.LabRequestItemId);
        builder.HasIndex(lr => lr.Status);
        builder.HasIndex(lr => lr.PerformedAt);
        builder.HasIndex(lr => lr.PublishedAt);

        builder.HasOne(lr => lr.LabRequestItem)
            .WithMany(i => i.Results)
            .HasForeignKey(lr => lr.LabRequestItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
