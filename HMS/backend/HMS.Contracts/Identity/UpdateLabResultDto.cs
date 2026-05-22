namespace HMS.Contracts.Identity;

public class UpdateLabResultDto
{
    public string ResultData { get; set; } = string.Empty;
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
    public bool RemoveAttachment { get; set; }
    public string? FileOriginalName { get; set; }
    public string? FileStoredName { get; set; }
    public string? FileContentType { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? FileStoragePath { get; set; }
}
