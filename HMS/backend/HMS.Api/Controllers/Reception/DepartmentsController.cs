using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Reception;

[ApiController]
[Route("api/departments")]
[Authorize]
public sealed class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departments;

    public DepartmentsController(IDepartmentService departments)
    {
        _departments = departments;
    }

    [HttpGet]
    [RequirePermission("Patients.Read")]
    public async Task<ActionResult<PaginatedResponse<DepartmentDto>>> GetDepartments(
        [FromQuery] PaginationQuery pagination,
        [FromQuery] bool all,
        CancellationToken cancellationToken)
    {
        return Ok(await _departments.GetDepartmentsAsync(pagination, all, cancellationToken));
    }
}
