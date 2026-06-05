using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/public/departments")]
public sealed class PublicDepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departments;

    public PublicDepartmentsController(IDepartmentService departments)
    {
        _departments = departments;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<DepartmentDto>>> GetDepartments(
        [FromQuery] PaginationQuery pagination,
        [FromQuery] bool all,
        CancellationToken cancellationToken)
    {
        return Ok(await _departments.GetDepartmentsAsync(pagination, all, cancellationToken));
    }
}
