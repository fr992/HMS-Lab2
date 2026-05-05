using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Identity.Infrastructure.Services;

public sealed class LabTestService : ILabTestService
{
    private readonly HmsDbContext _db;

    public LabTestService(HmsDbContext db)
    {
        _db = db;
    }

    public async Task<List<LabTestDto>> GetLabTestsAsync(
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = _db.LabTests.AsNoTracking();

        if (!includeInactive)
            query = query.Where(test => test.IsActive);

        return await query
            .OrderBy(test => test.Name)
            .Select(MapToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabTestDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.LabTests
            .AsNoTracking()
            .Where(test => test.Id == id)
            .Select(MapToDto)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<LabTestDto> CreateAsync(
        CreateLabTestDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new InvalidOperationException("Authenticated user is required.");

        if (request == null)
            throw new InvalidOperationException("Lab test payload is required.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Lab test name is required.");

        var name = request.Name.Trim();
        var exists = await _db.LabTests
            .AnyAsync(test => test.Name == name, cancellationToken);

        if (exists)
            throw new InvalidOperationException("A lab test with this name already exists.");

        var now = DateTime.UtcNow;
        var labTest = new LabTest
        {
            Name = name,
            Description = NormalizeOptional(request.Description),
            Price = request.Price,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = actorUserId,
            UpdatedById = actorUserId
        };

        _db.LabTests.Add(labTest);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labTest.Id, cancellationToken)
            ?? throw new InvalidOperationException("Lab test created but could not be loaded.");
    }

    public async Task<LabTestDto> UpdateAsync(
        int id,
        UpdateLabTestDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new InvalidOperationException("Authenticated user is required.");

        if (request == null)
            throw new InvalidOperationException("Lab test payload is required.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Lab test name is required.");

        var labTest = await _db.LabTests
            .FirstOrDefaultAsync(test => test.Id == id, cancellationToken);

        if (labTest == null)
            throw new InvalidOperationException("Lab test not found.");

        var name = request.Name.Trim();
        var exists = await _db.LabTests
            .AnyAsync(test => test.Id != id && test.Name == name, cancellationToken);

        if (exists)
            throw new InvalidOperationException("A lab test with this name already exists.");

        labTest.Name = name;
        labTest.Description = NormalizeOptional(request.Description);
        labTest.Price = request.Price;
        labTest.IsActive = request.IsActive;
        labTest.UpdatedAt = DateTime.UtcNow;
        labTest.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labTest.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated but not found.");
    }

    private static readonly Expression<Func<LabTest, LabTestDto>> MapToDto =
        test => new LabTestDto
        {
            Id = test.Id,
            Name = test.Name,
            Description = test.Description,
            Price = test.Price,
            IsActive = test.IsActive,
            CreatedAt = test.CreatedAt,
            UpdatedAt = test.UpdatedAt
        };

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }
}
