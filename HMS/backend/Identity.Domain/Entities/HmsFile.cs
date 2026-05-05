using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class HmsFile : BaseEntity
{
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;

    public ICollection<LabResult> LabResults { get; set; } = new List<LabResult>();
}
