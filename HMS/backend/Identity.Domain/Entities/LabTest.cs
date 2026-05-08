using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class LabTest : BaseEntity
{
    public string? TestCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SpecimenType { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<LabRequestItem> RequestItems { get; set; } = new List<LabRequestItem>();
}
