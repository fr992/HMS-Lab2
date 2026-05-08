using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class LabRequestItemConfiguration : IEntityTypeConfiguration<LabRequestItem>
{
    public void Configure(EntityTypeBuilder<LabRequestItem> builder)
    {
        builder.ToTable("LabRequestItems");

        builder.HasKey(lri => lri.Id);

        builder.Property(lri => lri.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(lri => lri.Notes)
            .HasMaxLength(1000);

        builder.HasIndex(lri => lri.LabRequestId);
        builder.HasIndex(lri => lri.LabTestId);
        builder.HasIndex(lri => lri.Status);

        builder.HasOne(lri => lri.LabRequest)
            .WithMany(lr => lr.Items)
            .HasForeignKey(lri => lri.LabRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(lri => lri.LabTest)
            .WithMany(lt => lt.RequestItems)
            .HasForeignKey(lri => lri.LabTestId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
