using System.Security.Claims;
using HMS.Api.Authorization;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers.Clinical;

[ApiController]
[Route("api/nurse-tasks")]
public sealed class NurseTasksController : ControllerBase
{
    private readonly INurseTaskService _service;

    public NurseTasksController(INurseTaskService service)
    {
        _service = service;
    }

    [HttpPost]
    [RequirePermission("NurseTasks.Assign")]
    public async Task<ActionResult<NurseTaskDto>> Create(
        [FromBody] CreateNurseTaskRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateAsync(request, CurrentUserId(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("encounter/{encounterId:int}")]
    [RequirePermission("NurseTasks.Read")]
    public async Task<ActionResult<IReadOnlyList<NurseTaskDto>>> GetByEncounter(
        int encounterId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByEncounterAsync(encounterId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("my")]
    [RequirePermission("NurseTasks.Read")]
    public async Task<ActionResult<IReadOnlyList<NurseTaskDto>>> GetMyTasks(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetMyTasksAsync(CurrentUserId(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [RequirePermission("NurseTasks.Assign")]
    public async Task<ActionResult<NurseTaskDto>> Update(
        int id,
        [FromBody] UpdateNurseTaskRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateAsync(id, request, CurrentUserId(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/complete")]
    [RequirePermission("NurseTasks.Complete")]
    public async Task<ActionResult<NurseTaskDto>> Complete(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CompleteAsync(id, CurrentUserId(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private int CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(value, out var userId))
            throw new UnauthorizedException("Invalid authenticated user.");

        return userId;
    }
}
