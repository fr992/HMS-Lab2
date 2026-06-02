using System.Security.Claims;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/data-transfer/{module}")]
public sealed class DataTransferController : ControllerBase
{
    private static readonly IReadOnlyDictionary<string, (string ReadPermission, string? ImportPermission)> Permissions =
        new Dictionary<string, (string, string?)>(StringComparer.OrdinalIgnoreCase)
        {
            ["patients"] = ("Patients.Read", "Patients.Register"),
            ["patient-contacts"] = ("Patients.Read", "Patients.Update"),
            ["appointments"] = ("Appointments.Read", "Appointments.Create"),
            ["appointment-requests"] = ("Appointments.Read", null),
            ["medications"] = ("Medications.Read", "Medications.Create"),
            ["lab-tests"] = ("LabTests.Read", "LabTests.Create"),
            ["lab-requests"] = ("LabRequests.Read", null),
            ["lab-results"] = ("LabResults.Read", null),
            ["beds"] = ("Beds.Read", "Beds.Create"),
            ["bed-assignments"] = ("Beds.Read", null),
            ["bed-assignment-requests"] = ("BedAssignmentRequests.Read", null),
            ["encounters"] = ("Encounters.Read", null),
            ["diagnoses"] = ("Encounters.Read", null),
            ["prescriptions"] = ("Prescriptions.Read", null),
            ["nurse-tasks"] = ("NurseTasks.Read", null),
            ["invoices"] = ("Invoices.Read", null),
            ["invoice-items"] = ("Invoices.Read", null),
            ["payments"] = ("Payments.Read", null),
            ["users"] = ("Users.Read", null),
            ["staff"] = ("Users.Read", null),
            ["roles"] = ("Roles.Read", "RolePermissions.Manage"),
            ["permissions"] = ("Permissions.Read", null),
            ["settings"] = ("Settings.Manage", "Settings.Manage"),
            ["audit-logs"] = ("AuditLogs.Read", null),
            ["departments"] = ("Patients.Read", null)
        };

    private readonly IDataTransferService _dataTransferService;

    public DataTransferController(IDataTransferService dataTransferService)
    {
        _dataTransferService = dataTransferService;
    }

    [HttpGet("export/{format}")]
    public async Task<IActionResult> Export(
        string module,
        string format,
        CancellationToken cancellationToken)
    {
        var access = GetAccess(module);
        if (!HasPermission(access.ReadPermission)) return Forbid();

        var filters = Request.Query.ToDictionary(
            item => item.Key,
            item => item.Value.FirstOrDefault(),
            StringComparer.OrdinalIgnoreCase);

        var export = await _dataTransferService.ExportAsync(
            module,
            format,
            filters,
            CurrentUserId() ?? 0,
            CurrentPermissions(),
            cancellationToken);

        return File(export.Content, export.ContentType, export.FileName);
    }

    [HttpPost("import/{format}")]
    public async Task<ActionResult<DataImportResultDto>> Import(
        string module,
        string format,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var access = GetAccess(module);
        if (access.ImportPermission is null)
            throw new BadRequestException("This data module is export-only.");
        if (!HasPermission(access.ImportPermission)) return Forbid();

        await using var stream = file.OpenReadStream();
        var result = await _dataTransferService.ImportAsync(
            module,
            format,
            file.FileName,
            stream,
            file.Length,
            CurrentUserId() ?? 0,
            cancellationToken);

        return Ok(result);
    }

    private static (string ReadPermission, string? ImportPermission) GetAccess(string module)
    {
        return Permissions.TryGetValue(module, out var access)
            ? access
            : throw new BadRequestException("Unsupported data module.");
    }

    private bool HasPermission(string permission)
    {
        return User.IsInRole("SuperAdmin") || User.HasClaim("permission", permission);
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(value, out var id) ? id : null;
    }

    private IReadOnlyCollection<string> CurrentPermissions()
    {
        return User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToArray();
    }
}
