using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public class LabResult : BaseEntity
{
    public int LabRequestItemId { get; set; }
    public LabRequestItem LabRequestItem { get; set; } = null!;

    public string ResultData { get; set; } = string.Empty;
    public string? ReferenceRange { get; set; }
    public string? Interpretation { get; set; }

    public int? FileId { get; set; }
    public HmsFile? File { get; set; }

    public int? VerifiedByUserId { get; set; }
    public User? VerifiedByUser { get; set; }
    public DateTime? VerifiedAt { get; set; }
}
