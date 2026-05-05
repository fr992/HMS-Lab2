namespace HMS.Contracts.Identity;

public class CreateLabResultDto
{
    public int LabRequestItemId { get; set; }
    public string ResultValue { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
    public string? Notes { get; set; }
    public DateTime? PerformedAt { get; set; }

    public string? AttachmentFileName { get; set; }
    public string? AttachmentContentType { get; set; }
    public long? AttachmentSizeBytes { get; set; }
    public string? AttachmentStoragePath { get; set; }
}
