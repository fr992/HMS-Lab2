using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HMS.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/departments")]
[Authorize(Roles = "Admin,SuperAdmin")]
public sealed class AdminDepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departments;

    public AdminDepartmentsController(IDepartmentService departments)
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

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> GetDepartment(int id, CancellationToken cancellationToken)
    {
        var department = await _departments.GetByIdAsync(id, cancellationToken);

        return department is null ? NotFound() : Ok(department);
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment(
        [FromBody] CreateDepartmentDto request,
        CancellationToken cancellationToken)
    {
        var dto = await _departments.CreateAsync(request, CurrentUserId(), cancellationToken);

        return CreatedAtAction(nameof(GetDepartment), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> UpdateDepartment(
        int id,
        [FromBody] UpdateDepartmentDto request,
        CancellationToken cancellationToken)
    {
        var department = await _departments.UpdateAsync(id, request, CurrentUserId(), cancellationToken);

        if (department is null)
            return NotFound();

        return Ok(department);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDepartment(int id, CancellationToken cancellationToken)
    {
        var result = await _departments.DeleteAsync(id, cancellationToken);

        return result switch
        {
            DeleteDepartmentResult.Deleted => NoContent(),
            DeleteDepartmentResult.NotFound => NotFound(),
            DeleteDepartmentResult.InUse => Conflict(new { error = "Department is in use by staff, beds, or appointments and cannot be deleted." }),
            _ => throw new InvalidOperationException($"Unsupported department delete result: {result}.")
        };
    }

    private int? CurrentUserId()
    {
        var value = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub");
        return int.TryParse(value, out var id) ? id : null;
    }

}
