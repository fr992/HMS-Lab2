using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class AppointmentRequestConfiguration : IEntityTypeConfiguration<AppointmentRequest>
{
    public void Configure(EntityTypeBuilder<AppointmentRequest> builder)
    {
        builder.ToTable("AppointmentRequests");

        builder.Property(a => a.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(a => a.Phone)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(a => a.ReasonForVisit)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(a => a.RejectionReason)
            .HasMaxLength(500);

        builder.Property(a => a.Status)
            .HasConversion<string>()
            .IsRequired();

        builder.HasOne(a => a.DoctorProfile)
            .WithMany()
            .HasForeignKey(a => a.DoctorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.DoctorProfileId);
        builder.HasIndex(a => a.Status);
        builder.HasIndex(a => a.PreferredDate);
        builder.HasIndex(a => new { a.DoctorProfileId, a.Status, a.PreferredDate });
        builder.HasIndex(a => new { a.Status, a.PreferredDate, a.CreatedAt });
    }
}
