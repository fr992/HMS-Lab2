using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class LabRequestItem : BaseEntity
{
    public int LabRequestId { get; set; }
    public LabRequest LabRequest { get; set; } = null!;

    public string? TestCode { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string? SpecimenType { get; set; }
    public string? Notes { get; set; }

    public ICollection<LabResult> Results { get; set; } = new List<LabResult>();
}
