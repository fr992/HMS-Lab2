using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class LabResult : BaseEntity
{
    public int LabRequestItemId { get; set; }
    public LabRequestItem LabRequestItem { get; set; } = null!;

    public string ResultValue { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
    public string? Notes { get; set; }

    public string Status { get; set; } = LabResultStatus.Draft;
    public DateTime PerformedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    public string? AttachmentFileName { get; set; }
    public string? AttachmentContentType { get; set; }
    public long? AttachmentSizeBytes { get; set; }
    public string? AttachmentStoragePath { get; set; }
}
