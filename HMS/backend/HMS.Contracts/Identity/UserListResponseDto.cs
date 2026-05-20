namespace HMS.Contracts.Identity;

public sealed class UserListResponseDto
{
    public IReadOnlyList<UserListItemResponseDto> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
    public UserListStatsDto Stats { get; set; } = new();

    public static UserListResponseDto Create(
        PaginatedResponse<UserListItemResponseDto> page,
        UserListStatsDto stats)
    {
        return new UserListResponseDto
        {
            Items = page.Items,
            Page = page.Page,
            PageSize = page.PageSize,
            TotalCount = page.TotalCount,
            TotalPages = page.TotalPages,
            HasNextPage = page.HasNextPage,
            HasPreviousPage = page.HasPreviousPage,
            Stats = stats
        };
    }
}
