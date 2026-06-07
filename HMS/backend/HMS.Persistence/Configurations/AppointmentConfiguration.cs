using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.HasIndex(a => new { a.DoctorProfileId, a.ScheduledStart });
        builder.HasIndex(a => new { a.DoctorProfileId, a.Status, a.ScheduledStart });
        builder.HasIndex(a => new { a.PatientProfileId, a.ScheduledStart });
        builder.HasIndex(a => new { a.Status, a.ScheduledStart });
        builder.HasIndex(a => a.AppointmentRequestId)
            .IsUnique()
            .HasFilter("[AppointmentRequestId] IS NOT NULL");

        builder.HasOne(a => a.AppointmentRequest)
            .WithOne(a => a.Appointment)
            .HasForeignKey<Appointment>(a => a.AppointmentRequestId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
