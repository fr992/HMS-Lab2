namespace HMS.Contracts.Identity;

public class LabResultAttachmentDto
{
    public int LabResultId { get; set; }
    public int FileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;
}
