using HMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HMS.Persistence.Configurations;

public sealed class PersonConfiguration : IEntityTypeConfiguration<Person>
{
    public void Configure(EntityTypeBuilder<Person> builder)
    {
        builder.ToTable("People");

        builder.Property(p => p.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.PersonalNumber)
            .HasMaxLength(100);

        builder.Property(p => p.Gender)
            .HasMaxLength(50);

        builder.Property(p => p.Phone)
            .HasMaxLength(30);

        builder.HasIndex(p => p.UserId);
        builder.HasIndex(p => p.PersonalNumber);
        builder.HasIndex(p => p.Phone);
        builder.HasIndex(p => new { p.LastName, p.FirstName });
        builder.HasIndex(p => new { p.Gender, p.LastName, p.FirstName });
    }
}
