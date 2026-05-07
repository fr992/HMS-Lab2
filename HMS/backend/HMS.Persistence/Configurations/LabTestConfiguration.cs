using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class LabTestConfiguration : IEntityTypeConfiguration<LabTest>
{
    public void Configure(EntityTypeBuilder<LabTest> builder)
    {
        builder.ToTable("LabTests");

        builder.HasKey(lt => lt.Id);

        builder.Property(lt => lt.TestCode)
            .HasMaxLength(50);

        builder.Property(lt => lt.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(lt => lt.SpecimenType)
            .HasMaxLength(100);

        builder.Property(lt => lt.Description)
            .HasMaxLength(1000);

        builder.Property(lt => lt.Price)
            .HasColumnType("decimal(18,2)");

        builder.Property(lt => lt.IsActive)
            .IsRequired();

        builder.HasIndex(lt => lt.Name)
            .IsUnique();

        builder.HasIndex(lt => lt.TestCode)
            .IsUnique()
            .HasFilter("[TestCode] IS NOT NULL");
    }
}
