using HMS.Shared.Entities;
using Identity.Domain.Entities;

namespace HMS.Domain.Entities;

public class Specialization : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<DoctorProfile> DoctorProfiles { get; set; } = new List<DoctorProfile>();
}