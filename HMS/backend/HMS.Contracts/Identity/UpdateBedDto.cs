namespace HMS.Contracts.Identity;

public sealed class UpdateBedDto
{
    public string Ward { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public string BedNumber { get; set; } = string.Empty;
    public string? Floor { get; set; }
    public int? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}
