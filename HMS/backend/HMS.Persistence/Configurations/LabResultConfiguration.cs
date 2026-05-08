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

        builder.Property(lr => lr.ResultData)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(lr => lr.ReferenceRange)
            .HasMaxLength(200);

        builder.Property(lr => lr.Interpretation)
            .HasMaxLength(200);

        builder.HasIndex(lr => lr.LabRequestItemId);
        builder.HasIndex(lr => lr.FileId);
        builder.HasIndex(lr => lr.VerifiedByUserId);
        builder.HasIndex(lr => lr.VerifiedAt);

        builder.HasOne(lr => lr.LabRequestItem)
            .WithMany(i => i.Results)
            .HasForeignKey(lr => lr.LabRequestItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(lr => lr.File)
            .WithMany(file => file.LabResults)
            .HasForeignKey(lr => lr.FileId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(lr => lr.VerifiedByUser)
            .WithMany()
            .HasForeignKey(lr => lr.VerifiedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
