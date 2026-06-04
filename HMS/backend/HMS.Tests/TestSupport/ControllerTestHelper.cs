using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Tests.TestSupport;

internal static class ControllerTestHelper
{
    public static void SetUser(
        ControllerBase controller,
        int userId = 42,
        IEnumerable<string>? permissions = null,
        IEnumerable<string>? roles = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString())
        };

        claims.AddRange((permissions ?? []).Select(permission => new Claim("permission", permission)));
        claims.AddRange((roles ?? []).Select(role => new Claim(ClaimTypes.Role, role)));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "UnitTest"))
            }
        };
    }

    public static T AssertOkValue<T>(ActionResult<T> actionResult)
    {
        var ok = Assert.IsType<OkObjectResult>(actionResult.Result);
        return Assert.IsAssignableFrom<T>(ok.Value);
    }

    public static T AssertCreatedValue<T>(ActionResult<T> actionResult, string actionName)
    {
        var created = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        Assert.Equal(actionName, created.ActionName);
        return Assert.IsAssignableFrom<T>(created.Value);
    }
}
