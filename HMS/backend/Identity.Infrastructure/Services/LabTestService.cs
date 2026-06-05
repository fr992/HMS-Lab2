using HMS.Application.Abstractions.Identity;
using HMS.Application.Abstractions.Persistence;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using Identity.Infrastructure.Common;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Identity.Infrastructure.Services;

public sealed class LabTestService : ILabTestService
{
    private readonly IRepository<LabTest> _labTests;
    private readonly IUnitOfWork _unitOfWork;

    public LabTestService(
        IRepository<LabTest> labTests,
        IUnitOfWork unitOfWork)
    {
        _labTests = labTests;
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedResponse<LabTestDto>> GetLabTestsAsync(
        bool? isActive,
        PaginationQuery pagination,
        CancellationToken cancellationToken)
    {
        var query = _labTests.Query();

        if (isActive.HasValue)
        {
            query = query.Where(lt => lt.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var search = pagination.Search.Trim();
            query = query.Where(lt =>
                (lt.TestCode != null && lt.TestCode.Contains(search))
                || lt.Name.Contains(search)
                || (lt.SpecimenType != null && lt.SpecimenType.Contains(search))
                || (lt.Description != null && lt.Description.Contains(search)));
        }

        return await query
            .OrderBy(test => test.Name)
            .Select(MapToDto)
            .ToPaginatedResponseAsync(pagination, cancellationToken);
    }

    public async Task<LabTestDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _labTests.Query()
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
        var exists = await _labTests.AnyAsync(
            test =>
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

        await _labTests.AddAsync(labTest, cancellationToken);
        await SaveOrThrowConflictAsync(cancellationToken);

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

        var labTest = await _labTests.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (labTest == null)
            throw new NotFoundException("Lab test not found.");

        var name = request.Name.Trim();
        var testCode = NormalizeOptional(request.TestCode);
        ValidatePrice(request.Price);
        var exists = await _labTests.AnyAsync(
            test =>
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

        await SaveOrThrowConflictAsync(cancellationToken);

        return await GetByIdAsync(labTest.Id, cancellationToken)
            ?? throw new Exception("Lab test was updated but could not be loaded.");
    }


    public async Task DeleteAsync(
        int id,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var labTest = await _labTests.GetByIdAsync(
            id,
            asNoTracking: false,
            cancellationToken);

        if (labTest == null)
            throw new NotFoundException("Lab test not found.");

        labTest.IsActive = false;
        labTest.UpdatedAt = DateTime.UtcNow;
        labTest.UpdatedById = actorUserId;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
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

    private async Task SaveOrThrowConflictAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new ConflictException("A lab test with this name or code already exists.", ex);
        }
    }
}
