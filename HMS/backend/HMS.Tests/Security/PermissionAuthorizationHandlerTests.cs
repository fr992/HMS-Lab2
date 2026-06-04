using System.Security.Claims;
using HMS.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace HMS.Tests.Security;

public sealed class PermissionAuthorizationHandlerTests
{
    [Fact]
    public async Task HandleAsync_WhenUserIsSuperAdmin_SucceedsWithoutPermissionClaim()
    {
        var requirement = new PermissionRequirement("Patients.Delete");
        var context = CreateContext(requirement, new Claim(ClaimTypes.Role, "SuperAdmin"));
        var handler = CreateHandler();

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleAsync_WhenUserHasMatchingPermissionClaim_Succeeds()
    {
        var requirement = new PermissionRequirement("Appointments.Read");
        var context = CreateContext(requirement, new Claim(PermissionAuthorizationHandler.PermissionClaimType, "Appointments.Read"));
        var handler = CreateHandler();

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleAsync_WhenUserLacksPermission_DoesNotSucceed()
    {
        var requirement = new PermissionRequirement("Settings.Manage");
        var context = CreateContext(requirement, new Claim(PermissionAuthorizationHandler.PermissionClaimType, "Appointments.Read"));
        var handler = CreateHandler();

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    private static AuthorizationHandlerContext CreateContext(PermissionRequirement requirement, params Claim[] claims)
    {
        var identity = new ClaimsIdentity(claims, "UnitTest");
        return new AuthorizationHandlerContext([requirement], new ClaimsPrincipal(identity), null);
    }

    private static PermissionAuthorizationHandler CreateHandler()
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.SetupGet(item => item.HttpContext).Returns(new DefaultHttpContext());
        return new PermissionAuthorizationHandler(
            accessor.Object,
            Mock.Of<ILogger<PermissionAuthorizationHandler>>());
    }
}
