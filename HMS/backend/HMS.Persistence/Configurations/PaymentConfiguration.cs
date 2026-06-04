using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount).HasPrecision(18, 2);

        builder.Property(x => x.PaymentMethod)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.TransactionReference)
            .HasMaxLength(200);

        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired();

        builder.HasOne(x => x.Invoice)
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReceivedByUser)
            .WithMany()
            .HasForeignKey(x => x.ReceivedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.InvoiceId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.PaymentMethod);
        builder.HasIndex(x => x.PaidAt);
        builder.HasIndex(x => x.ReceivedByUserId);
        builder.HasIndex(x => new { x.Status, x.PaidAt });
    }
}
