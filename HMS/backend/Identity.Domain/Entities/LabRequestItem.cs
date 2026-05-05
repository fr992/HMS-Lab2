using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class LabRequestItem : BaseEntity
{
    public int LabRequestId { get; set; }
    public LabRequest LabRequest { get; set; } = null!;

    public int LabTestId { get; set; }
    public LabTest LabTest { get; set; } = null!;

    public string Status { get; set; } = LabRequestStatus.Requested;
    public string? Notes { get; set; }

    public ICollection<LabResult> Results { get; set; } = new List<LabResult>();
}
