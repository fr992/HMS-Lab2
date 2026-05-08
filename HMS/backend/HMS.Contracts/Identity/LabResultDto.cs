namespace HMS.Contracts.Identity;

public class LabResultDto
{
    public int Id { get; set; }
    public int LabRequestItemId { get; set; }
    public int LabRequestId { get; set; }
    public string RequestNumber { get; set; } = string.Empty;
    public int EncounterId { get; set; }
    public int PatientProfileId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? TestCode { get; set; }
    public string ResultData { get; set; } = string.Empty;
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }
    public int? FileId { get; set; }
    public bool HasAttachment { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentContentType { get; set; }
    public long? AttachmentSizeBytes { get; set; }
    public int? VerifiedByUserId { get; set; }
    public string? VerifiedByUserName { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
