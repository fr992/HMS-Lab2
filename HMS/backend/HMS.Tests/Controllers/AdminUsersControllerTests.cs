using HMS.Api.Controllers.Admin;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace HMS.Tests.Controllers;

public sealed class AdminUsersControllerTests
{
    private readonly Mock<IUserManagementService> _userManagement = new();
    private readonly AdminUsersController _controller;

    public AdminUsersControllerTests()
    {
        _controller = new AdminUsersController(_userManagement.Object);
        ControllerTestHelper.SetUser(_controller, userId: 77, roles: ["SuperAdmin"]);
    }

    [Fact]
    public async Task Create_PassesCurrentUserAndReturnsCreated()
    {
        var request = new CreateUserRequestDto { UserName = "newuser", Email = "new@hms.test" };
        var created = new CreatedUserResponseDto { Id = 12, UserName = request.UserName, Email = request.Email };
        _userManagement
            .Setup(service => service.CreateUserAsync(request, 77, It.IsAny<CancellationToken>()))
            .ReturnsAsync((created, null));

        var result = await _controller.Create(request, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal("/api/admin/users/12", createdResult.Location);
        Assert.Same(created, createdResult.Value);
    }

    [Fact]
    public async Task Create_WhenServiceReturnsError_ReturnsBadRequest()
    {
        _userManagement
            .Setup(service => service.CreateUserAsync(It.IsAny<CreateUserRequestDto>(), 77, It.IsAny<CancellationToken>()))
            .ReturnsAsync((null, "Email already exists."));

        var result = await _controller.Create(new CreateUserRequestDto(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task List_UsesQFallbackAndIsActiveStatus()
    {
        var pagination = new PaginationQuery { Page = 2, PageSize = 25 };
        var response = new UserListResponseDto { Page = 2, PageSize = 25, TotalCount = 1 };
        _userManagement
            .Setup(service => service.ListUsersAsync(
                "ana",
                "Doctor",
                "active",
                true,
                pagination,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((response, null));

        var result = await _controller.List(
            search: null,
            q: "ana",
            role: "Doctor",
            status: null,
            isActive: true,
            staffOnly: true,
            pagination,
            CancellationToken.None);

        Assert.Same(response, ControllerTestHelper.AssertOkValue(result));
    }

    [Fact]
    public async Task GetById_WhenMissing_ReturnsNotFound()
    {
        _userManagement
            .Setup(service => service.GetUserByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((null, "User not found."));

        var result = await _controller.GetById(404, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task SetActive_WhenSuccessful_ReturnsNoContent()
    {
        _userManagement
            .Setup(service => service.SetUserActiveAsync(5, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((true, null));

        var result = await _controller.SetActive(5, new SetUserActiveRequestDto { IsActive = false }, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }
}
