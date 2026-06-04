using HMS.Contracts.Identity;

namespace HMS.Tests.Contracts;

public sealed class PaginationContractTests
{
    [Fact]
    public void BedListQuery_DefaultsToFortyRows()
    {
        var query = new BedListQueryDto();

        Assert.Equal(1, query.Page);
        Assert.Equal(40, query.PageSize);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(-4, 1)]
    [InlineData(3, 3)]
    public void BedListQuery_NormalizesPage(int requestedPage, int expectedPage)
    {
        var query = new BedListQueryDto { Page = requestedPage };

        Assert.Equal(expectedPage, query.Page);
    }

    [Theory]
    [InlineData(0, 40)]
    [InlineData(-8, 40)]
    [InlineData(25, 25)]
    [InlineData(400, 100)]
    public void BedListQuery_ClampsPageSize(int requestedPageSize, int expectedPageSize)
    {
        var query = new BedListQueryDto { PageSize = requestedPageSize };

        Assert.Equal(expectedPageSize, query.PageSize);
    }

    [Fact]
    public void PaginatedResponse_Create_ComputesPageMetadata()
    {
        var response = PaginatedResponse<int>.Create([1, 2, 3], page: 2, pageSize: 3, totalCount: 8);

        Assert.Equal([1, 2, 3], response.Items);
        Assert.Equal(2, response.Page);
        Assert.Equal(3, response.PageSize);
        Assert.Equal(8, response.TotalCount);
        Assert.Equal(3, response.TotalPages);
        Assert.True(response.HasNextPage);
        Assert.True(response.HasPreviousPage);
    }

    [Fact]
    public void PaginatedResponse_Create_HandlesEmptyResults()
    {
        var response = PaginatedResponse<int>.Create([], page: 1, pageSize: 40, totalCount: 0);

        Assert.Empty(response.Items);
        Assert.Equal(0, response.TotalPages);
        Assert.False(response.HasNextPage);
        Assert.False(response.HasPreviousPage);
    }
}
