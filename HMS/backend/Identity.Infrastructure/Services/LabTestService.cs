using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
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
        bool? isActive,
        CancellationToken cancellationToken)
    {
        var query = _db.LabTests
                   .AsNoTracking()
                   .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(lt => lt.IsActive == isActive.Value);
        }

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
            throw new UnauthorizedException("Authenticated user is required.");

        if (request == null)
            throw new BadRequestException("Lab test payload is required.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BadRequestException("Lab test name is required.");

        var name = request.Name.Trim();
        var testCode = NormalizeOptional(request.TestCode);
        ValidatePrice(request.Price);
        var exists = await _db.LabTests
            .AnyAsync(test =>
                test.Name == name ||
                (testCode != null && test.TestCode == testCode),
                cancellationToken);

        if (exists)
            throw new ConflictException("A lab test with this name or code already exists.");

        var now = DateTime.UtcNow;
        var labTest = new LabTest
        {
            TestCode = testCode,
            Name = name,
            SpecimenType = NormalizeOptional(request.SpecimenType),
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
            ?? throw new Exception("Lab test was created but could not be loaded.");
    }

    public async Task<LabTestDto> UpdateAsync(
        int id,
        UpdateLabTestDto request,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        if (actorUserId == null)
            throw new UnauthorizedException("Authenticated user is required.");

        if (request == null)
            throw new BadRequestException("Lab test payload is required.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BadRequestException("Lab test name is required.");

        var labTest = await _db.LabTests
            .FirstOrDefaultAsync(test => test.Id == id, cancellationToken);

        if (labTest == null)
            throw new NotFoundException("Lab test not found.");

        var name = request.Name.Trim();
        var testCode = NormalizeOptional(request.TestCode);
        ValidatePrice(request.Price);
        var exists = await _db.LabTests
            .AnyAsync(test =>
                test.Id != id &&
                (test.Name == name || (testCode != null && test.TestCode == testCode)),
                cancellationToken);

        if (exists)
            throw new ConflictException("A lab test with this name or code already exists.");

        labTest.TestCode = testCode;
        labTest.Name = name;
        labTest.SpecimenType = NormalizeOptional(request.SpecimenType);
        labTest.Description = NormalizeOptional(request.Description);
        labTest.Price = request.Price;
        labTest.IsActive = request.IsActive;
        labTest.UpdatedAt = DateTime.UtcNow;
        labTest.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(labTest.Id, cancellationToken)
            ?? throw new Exception("Lab test was updated but could not be loaded.");
    }


    public async Task DeleteAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var labTest = await _db.LabTests
            .FirstOrDefaultAsync(lt => lt.Id == id, cancellationToken);

        if (labTest == null)
            throw new NotFoundException("Lab test not found.");

        labTest.IsActive = false;
        labTest.UpdatedAt = DateTime.UtcNow;
        labTest.UpdatedById = actorUserId;

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static readonly Expression<Func<LabTest, LabTestDto>> MapToDto =
        test => new LabTestDto
        {
            Id = test.Id,
            TestCode = test.TestCode,
            Name = test.Name,
            SpecimenType = test.SpecimenType,
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

    private static void ValidatePrice(decimal? price)
    {
        if (price is < 0)
            throw new BadRequestException("Lab test price cannot be negative.");
    }
}
