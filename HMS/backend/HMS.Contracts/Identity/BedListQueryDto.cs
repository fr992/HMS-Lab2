namespace HMS.Contracts.Identity;

public sealed class BedListQueryDto
{
    private const int DefaultPage = 1;
    private const int DefaultPageSize = 40;
    private const int MaxPageSize = 100;

    private int _page = DefaultPage;
    private int _pageSize = DefaultPageSize;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? DefaultPage : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value switch
        {
            < 1 => DefaultPageSize,
            > MaxPageSize => MaxPageSize,
            _ => value
        };
    }

    public string? Status { get; set; }
    public int? DepartmentId { get; set; }
    public string? Search { get; set; }
    public string? RoomNumber { get; set; }
    public string? AssignmentStatus { get; set; }
    public int? PatientProfileId { get; set; }
    public int? EncounterId { get; set; }
}
