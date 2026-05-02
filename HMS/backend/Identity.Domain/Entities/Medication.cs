using HMS.Domain.Entities;
using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class Medication : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}