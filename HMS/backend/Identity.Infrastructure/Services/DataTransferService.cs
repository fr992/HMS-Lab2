using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using HMS.Application.Abstractions.Identity;
using HMS.Application.Exceptions;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Application.Abstractions.Persistence;
using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Services;

public sealed class DataTransferService : IDataTransferService
{
    private const long MaxFileSizeBytes = 5 * 1024 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly IHmsRepository _db;


    private readonly IUnitOfWork _unitOfWork;

    public DataTransferService(IHmsRepository db,
        IUnitOfWork unitOfWork)
    {
        _db = db;

        _unitOfWork = unitOfWork;
    }

    public async Task<DataExportFileDto> ExportAsync(
        string module,
        string format,
        IReadOnlyDictionary<string, string?> filters,
        int actorUserId,
        IReadOnlyCollection<string> permissions,
        CancellationToken cancellationToken)
    {
        var definition = GetDefinition(module);
        var normalizedFormat = NormalizeFormat(format);
        var rows = await definition.ExportAsync(_db, filters, actorUserId, permissions, cancellationToken);
        var bytes = normalizedFormat switch
        {
            "csv" => WriteCsv(definition.Headers, rows),
            "excel" => WriteExcel(definition.DisplayName, definition.Headers, rows),
            "json" => JsonSerializer.SerializeToUtf8Bytes(
                rows.Select(row => definition.Headers.ToDictionary(header => header, header => row.GetValueOrDefault(header))).ToList(),
                JsonOptions),
            _ => throw new BadRequestException("Unsupported export format.")
        };

        return new DataExportFileDto
        {
            FileName = $"{definition.FilePrefix}_{DateTime.UtcNow:yyyy-MM-dd}.{(normalizedFormat == "excel" ? "xlsx" : normalizedFormat)}",
            ContentType = normalizedFormat switch
            {
                "csv" => "text/csv; charset=utf-8",
                "excel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "json" => "application/json; charset=utf-8",
                _ => "application/octet-stream"
            },
            Content = bytes
        };
    }

    public async Task<DataImportResultDto> ImportAsync(
        string module,
        string format,
        string fileName,
        Stream fileStream,
        long fileLength,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (fileLength <= 0)
            throw new BadRequestException("Import file is required.");
        if (fileLength > MaxFileSizeBytes)
            throw new BadRequestException("Import file cannot exceed 5 MB.");

        var definition = GetDefinition(module);
        var normalizedFormat = NormalizeFormat(format);
        EnsureExtension(fileName, normalizedFormat);

        var rows = normalizedFormat switch
        {
            "csv" => await ReadCsvAsync(fileStream, cancellationToken),
            "excel" => ReadExcel(fileStream),
            "json" => await ReadJsonAsync(fileStream, cancellationToken),
            _ => throw new BadRequestException("Unsupported import format.")
        };

        ValidateHeaders(definition, rows);

        return await _unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var result = new DataImportResultDto { TotalRows = rows.Count };

            foreach (var row in rows.Select((value, index) => new { Row = value, RowNumber = index + 2 }))
            {
                try
                {
                    var imported = await definition.ImportAsync(_db, row.Row, actorUserId, ct);
                    if (imported) result.Imported++;
                    else result.Skipped++;
                }
                catch (Exception ex) when (ex is InvalidOperationException or AppException or FormatException)
                {
                    result.Failed++;
                    result.Errors.Add(new DataImportRowErrorDto
                    {
                        RowNumber = row.RowNumber,
                        Error = ex.Message
                    });
                }
            }

            if (result.Failed > 0)
                return result;

            await _unitOfWork.SaveChangesAsync(ct);
            return result;
        }, cancellationToken);
    }

    private static ModuleDefinition GetDefinition(string module)
    {
        return module.Trim().ToLowerInvariant() switch
        {
            "patients" => PatientsDefinition,
            "patient-contacts" => PatientContactsDefinition,
            "appointments" => AppointmentsDefinition,
            "appointment-requests" => AppointmentRequestsDefinition,
            "medications" => MedicationsDefinition,
            "lab-tests" => LabTestsDefinition,
            "lab-requests" => LabRequestsDefinition,
            "lab-results" => LabResultsDefinition,
            "beds" => BedsDefinition,
            "bed-assignments" => BedAssignmentsDefinition,
            "bed-assignment-requests" => BedAssignmentRequestsDefinition,
            "encounters" => EncountersDefinition,
            "diagnoses" => DiagnosesDefinition,
            "prescriptions" => PrescriptionsDefinition,
            "nurse-tasks" => NurseTasksDefinition,
            "invoices" => InvoicesDefinition,
            "invoice-items" => InvoiceItemsDefinition,
            "payments" => PaymentsDefinition,
            "users" => UsersDefinition,
            "staff" => StaffDefinition,
            "roles" => RolesDefinition,
            "permissions" => PermissionsDefinition,
            "settings" => SettingsDefinition,
            "audit-logs" => AuditLogsDefinition,
            "departments" => DepartmentsDefinition,
            _ => throw new BadRequestException("Unsupported data module.")
        };
    }

    private static string NormalizeFormat(string format)
    {
        return format.Trim().ToLowerInvariant() switch
        {
            "csv" => "csv",
            "xlsx" or "excel" => "excel",
            "json" => "json",
            _ => throw new BadRequestException("Supported formats are csv, excel, and json.")
        };
    }

    private static void EnsureExtension(string fileName, string format)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var expected = format == "excel" ? ".xlsx" : $".{format}";
        if (extension != expected)
            throw new BadRequestException($"Expected a {expected} file.");
    }

    private static void ValidateHeaders(ModuleDefinition definition, IReadOnlyCollection<Dictionary<string, string?>> rows)
    {
        if (rows.Count == 0)
            throw new BadRequestException("Import file contains no data rows.");

        var supplied = rows.First().Keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = definition.RequiredHeaders.Where(header => !supplied.Contains(header)).ToList();
        if (missing.Count > 0)
            throw new BadRequestException($"Import file is missing required columns: {string.Join(", ", missing)}.");
    }

    private static byte[] WriteCsv(IReadOnlyList<string> headers, IReadOnlyList<Dictionary<string, string?>> rows)
    {
        var builder = new StringBuilder();
        builder.Append('\uFEFF');
        builder.AppendLine(string.Join(",", headers.Select(EscapeCsv)));
        foreach (var row in rows)
            builder.AppendLine(string.Join(",", headers.Select(header => EscapeCsv(row.GetValueOrDefault(header)))));
        return Encoding.UTF8.GetBytes(builder.ToString());
    }

    private static byte[] WriteExcel(string sheetName, IReadOnlyList<string> headers, IReadOnlyList<Dictionary<string, string?>> rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(sheetName);
        for (var i = 0; i < headers.Count; i++)
            sheet.Cell(1, i + 1).Value = headers[i];
        for (var r = 0; r < rows.Count; r++)
        {
            for (var c = 0; c < headers.Count; c++)
                sheet.Cell(r + 2, c + 1).Value = rows[r].GetValueOrDefault(headers[c]) ?? string.Empty;
        }
        sheet.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static async Task<List<Dictionary<string, string?>>> ReadCsvAsync(Stream stream, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: false);
        var lines = new List<string>();
        while (!reader.EndOfStream)
            lines.Add(await reader.ReadLineAsync(cancellationToken) ?? string.Empty);
        if (lines.Count < 2)
            throw new BadRequestException("CSV file must include headers and at least one row.");

        var headers = ParseCsvLine(lines[0]);
        return lines.Skip(1)
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => ToRow(headers, ParseCsvLine(line)))
            .ToList();
    }

    private static List<Dictionary<string, string?>> ReadExcel(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new BadRequestException("Excel file does not contain a worksheet.");
        var headerRow = sheet.Row(1);
        var headers = headerRow.CellsUsed().Select(cell => cell.GetString().Trim()).Where(x => x.Length > 0).ToList();
        if (headers.Count == 0)
            throw new BadRequestException("Excel file must include a header row.");

        return sheet.RowsUsed().Skip(1)
            .Select(row => ToRow(headers, headers.Select((_, index) => row.Cell(index + 1).GetFormattedString()).ToList()))
            .Where(row => row.Values.Any(value => !string.IsNullOrWhiteSpace(value)))
            .ToList();
    }

    private static async Task<List<Dictionary<string, string?>>> ReadJsonAsync(Stream stream, CancellationToken cancellationToken)
    {
        var rows = await JsonSerializer.DeserializeAsync<List<Dictionary<string, JsonElement>>>(stream, JsonOptions, cancellationToken)
            ?? throw new BadRequestException("JSON file must contain an array of objects.");

        return rows.Select(row => row.ToDictionary(
                pair => pair.Key,
                pair => pair.Value.ValueKind == JsonValueKind.Null ? null : pair.Value.ToString(),
                StringComparer.OrdinalIgnoreCase))
            .ToList();
    }

    private static Dictionary<string, string?> ToRow(IReadOnlyList<string> headers, IReadOnlyList<string> values)
    {
        if (values.Count > headers.Count)
            throw new BadRequestException("Import row has more values than headers.");

        var row = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < headers.Count; i++)
            row[headers[i]] = i < values.Count ? values[i]?.Trim() : null;
        return row;
    }

    private static List<string> ParseCsvLine(string line)
    {
        var values = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (ch == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (ch == ',' && !inQuotes)
            {
                values.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(ch);
            }
        }
        if (inQuotes)
            throw new BadRequestException("Malformed CSV file.");
        values.Add(current.ToString());
        return values;
    }

    private static string EscapeCsv(string? value)
    {
        var text = value ?? string.Empty;
        return text.Contains('"') || text.Contains(',') || text.Contains('\n') || text.Contains('\r')
            ? $"\"{text.Replace("\"", "\"\"")}\""
            : text;
    }

    private static string? Value(Dictionary<string, string?> row, string key)
    {
        return row.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value.Trim()
            : null;
    }

    private static string Required(Dictionary<string, string?> row, string key)
    {
        return Value(row, key) ?? throw new BadRequestException($"{key} is required.");
    }

    private static int? IntValue(Dictionary<string, string?> row, string key)
    {
        var value = Value(row, key);
        if (value is null) return null;
        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : throw new BadRequestException($"{key} must be a valid number.");
    }

    private static decimal? DecimalValue(Dictionary<string, string?> row, string key)
    {
        var value = Value(row, key);
        if (value is null) return null;
        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : throw new BadRequestException($"{key} must be a valid decimal.");
    }

    private static bool BoolValue(Dictionary<string, string?> row, string key, bool defaultValue)
    {
        var value = Value(row, key);
        if (value is null) return defaultValue;
        if (bool.TryParse(value, out var parsed)) return parsed;
        return value.Equals("yes", StringComparison.OrdinalIgnoreCase) || value == "1"
            ? true
            : value.Equals("no", StringComparison.OrdinalIgnoreCase) || value == "0"
                ? false
                : throw new BadRequestException($"{key} must be true or false.");
    }

    private static DateTime? DateValue(Dictionary<string, string?> row, string key)
    {
        var value = Value(row, key);
        if (value is null) return null;
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed
            : throw new BadRequestException($"{key} must be a valid date.");
    }

    private sealed record ModuleDefinition(
        string DisplayName,
        string FilePrefix,
        IReadOnlyList<string> Headers,
        IReadOnlyList<string> RequiredHeaders,
        Func<IHmsRepository, IReadOnlyDictionary<string, string?>, int, IReadOnlyCollection<string>, CancellationToken, Task<List<Dictionary<string, string?>>>> ExportAsync,
        Func<IHmsRepository, Dictionary<string, string?>, int, CancellationToken, Task<bool>> ImportAsync);

    private static Task<bool> ExportOnlyImport(IHmsRepository _, Dictionary<string, string?> __, int ___, CancellationToken ____)
    {
        throw new BadRequestException("This data module is export-only.");
    }

    private static readonly ModuleDefinition MedicationsDefinition = new(
        "Medications",
        "medications",
        ["Id", "Name", "Description", "IsActive", "CreatedAt", "UpdatedAt"],
        ["Name"],
        async (db, filters, _, _, ct) =>
        {
            var isActive = ParseNullableBoolFilter(filters.GetValueOrDefault("isActive"));
            var search = filters.GetValueOrDefault("search");
            var query = db.Query<Medication>().AsNoTracking().AsQueryable();
            if (isActive.HasValue) query = query.Where(x => x.IsActive == isActive.Value);
            if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Name.Contains(search) || (x.Description != null && x.Description.Contains(search)));
            var items = await query.OrderBy(x => x.Name).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("Name", x.Name),
                ("Description", x.Description),
                ("IsActive", x.IsActive.ToString()),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var name = Required(row, "Name");
            if (await db.Query<Medication>().AnyAsync(x => x.Name == name, ct)) return false;
            var now = DateTime.UtcNow;
            db.Add<Medication>(new Medication { Name = name, Description = Value(row, "Description"), IsActive = BoolValue(row, "IsActive", true), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static readonly ModuleDefinition LabTestsDefinition = new(
        "Lab Tests",
        "lab_tests",
        ["Id", "TestCode", "Name", "SpecimenType", "Description", "Price", "IsActive", "CreatedAt", "UpdatedAt"],
        ["Name"],
        async (db, filters, _, _, ct) =>
        {
            var isActive = ParseNullableBoolFilter(filters.GetValueOrDefault("isActive"));
            var search = filters.GetValueOrDefault("search");
            var query = db.Query<LabTest>().AsNoTracking().AsQueryable();
            if (isActive.HasValue) query = query.Where(x => x.IsActive == isActive.Value);
            if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Name.Contains(search) || (x.TestCode != null && x.TestCode.Contains(search)) || (x.SpecimenType != null && x.SpecimenType.Contains(search)) || (x.Description != null && x.Description.Contains(search)));
            var items = await query.OrderBy(x => x.Name).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("TestCode", x.TestCode),
                ("Name", x.Name),
                ("SpecimenType", x.SpecimenType),
                ("Description", x.Description),
                ("Price", x.Price.HasValue ? x.Price.Value.ToString(CultureInfo.InvariantCulture) : null),
                ("IsActive", x.IsActive.ToString()),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var name = Required(row, "Name");
            var code = Value(row, "TestCode");
            var price = DecimalValue(row, "Price");
            if (price is < 0) throw new BadRequestException("Price cannot be negative.");
            if (await db.Query<LabTest>().AnyAsync(x => x.Name == name || (code != null && x.TestCode == code), ct)) return false;
            var now = DateTime.UtcNow;
            db.Add<LabTest>(new LabTest { TestCode = code, Name = name, SpecimenType = Value(row, "SpecimenType"), Description = Value(row, "Description"), Price = price, IsActive = BoolValue(row, "IsActive", true), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static readonly ModuleDefinition BedsDefinition = new(
        "Beds",
        "beds",
        ["Id", "Ward", "RoomNumber", "BedNumber", "Floor", "DepartmentId", "DepartmentName", "IsActive", "Status", "Notes", "CreatedAt", "UpdatedAt"],
        ["Ward", "RoomNumber", "BedNumber"],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var departmentId = ParseNullableIntFilter(filters.GetValueOrDefault("departmentId"));
            var query = db.Query<Bed>().AsNoTracking().Where(x => !departmentId.HasValue || x.DepartmentId == departmentId.Value);
            if (status == "Available") query = query.Where(x => x.IsActive && !x.Assignments.Any(a => a.ReleasedAt == null));
            else if (status == "Occupied") query = query.Where(x => x.IsActive && x.Assignments.Any(a => a.ReleasedAt == null));
            else if (status == "Inactive") query = query.Where(x => !x.IsActive);
            var items = await query
                .Include(x => x.Department)
                .Include(x => x.Assignments)
                .OrderBy(x => x.Ward)
                .ThenBy(x => x.RoomNumber)
                .ThenBy(x => x.BedNumber)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("Ward", x.Ward),
                ("RoomNumber", x.RoomNumber),
                ("BedNumber", x.BedNumber),
                ("Floor", x.Floor),
                ("DepartmentId", x.DepartmentId.HasValue ? x.DepartmentId.Value.ToString() : null),
                ("DepartmentName", x.Department == null ? null : x.Department.Name),
                ("IsActive", x.IsActive.ToString()),
                ("Status", !x.IsActive ? "Inactive" : x.Assignments.Any(a => a.ReleasedAt == null) ? "Occupied" : "Available"),
                ("Notes", x.Notes),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var ward = Required(row, "Ward");
            var room = Required(row, "RoomNumber");
            var bedNo = Required(row, "BedNumber");
            var departmentId = IntValue(row, "DepartmentId");
            if (departmentId.HasValue && !await db.Query<Department>().AnyAsync(x => x.Id == departmentId.Value, ct)) throw new BadRequestException("DepartmentId does not exist.");
            if (await db.Query<Bed>().AnyAsync(x => x.Ward == ward && x.RoomNumber == room && x.BedNumber == bedNo, ct)) return false;
            var now = DateTime.UtcNow;
            db.Add<Bed>(new Bed { Ward = ward, RoomNumber = room, BedNumber = bedNo, Floor = Value(row, "Floor"), DepartmentId = departmentId, IsActive = BoolValue(row, "IsActive", true), Notes = Value(row, "Notes"), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static readonly ModuleDefinition PatientsDefinition = new(
        "Patients",
        "patients",
        ["Id", "PatientNumber", "FirstName", "LastName", "PersonalNumber", "DateOfBirth", "Gender", "Phone", "Address", "City", "Country", "InsuranceNumber", "BloodType", "PrimaryDoctorId", "PrimaryDoctorName", "CreatedAt", "UpdatedAt"],
        ["FirstName", "LastName"],
        async (db, filters, _, _, ct) =>
        {
            var gender = filters.GetValueOrDefault("gender");
            var hasPortal = ParseNullableBoolFilter(filters.GetValueOrDefault("hasPortal"));
            var search = filters.GetValueOrDefault("search");
            var query = db.Query<PatientProfile>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(gender) && !gender.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Person.Gender == gender);
            if (hasPortal.HasValue) query = query.Where(x => hasPortal.Value ? x.Person.UserId != null : x.Person.UserId == null);
            if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.PatientNumber.Contains(search) || x.Person.FirstName.Contains(search) || x.Person.LastName.Contains(search) || (x.Person.PersonalNumber != null && x.Person.PersonalNumber.Contains(search)));
            var items = await query
                .Include(x => x.Person)
                .Include(x => x.PrimaryDoctor!)
                .ThenInclude(x => x.StaffProfile)
                .ThenInclude(x => x.Person)
                .OrderBy(x => x.Person.LastName)
                .ThenBy(x => x.Person.FirstName)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("PatientNumber", x.PatientNumber),
                ("FirstName", x.Person.FirstName),
                ("LastName", x.Person.LastName),
                ("PersonalNumber", x.Person.PersonalNumber),
                ("DateOfBirth", x.Person.DateOfBirth.HasValue ? FormatDate(x.Person.DateOfBirth.Value) : null),
                ("Gender", x.Person.Gender),
                ("Phone", x.Person.Phone),
                ("Address", x.Person.Address),
                ("City", x.Person.City),
                ("Country", x.Person.Country),
                ("InsuranceNumber", x.InsuranceNumber),
                ("BloodType", x.BloodType),
                ("PrimaryDoctorId", x.PrimaryDoctorId.HasValue ? x.PrimaryDoctorId.Value.ToString() : null),
                ("PrimaryDoctorName", x.PrimaryDoctor == null ? null : x.PrimaryDoctor.StaffProfile.Person.FirstName + " " + x.PrimaryDoctor.StaffProfile.Person.LastName),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var personalNumber = Value(row, "PersonalNumber");
            if (personalNumber != null && await db.Query<Person>().AnyAsync(x => x.PersonalNumber == personalNumber, ct)) return false;
            var doctorId = IntValue(row, "PrimaryDoctorId");
            if (doctorId.HasValue && !await db.Query<DoctorProfile>().AnyAsync(x => x.Id == doctorId.Value, ct)) throw new BadRequestException("PrimaryDoctorId does not exist.");
            var now = DateTime.UtcNow;
            var person = new Person { FirstName = Required(row, "FirstName"), LastName = Required(row, "LastName"), PersonalNumber = personalNumber, DateOfBirth = DateValue(row, "DateOfBirth"), Gender = Value(row, "Gender"), Phone = Value(row, "Phone"), Address = Value(row, "Address"), City = Value(row, "City"), Country = Value(row, "Country"), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor };
            db.Add<Person>(person);
            await db.SaveChangesAsync(ct);
            var profile = new PatientProfile { PersonId = person.Id, PatientNumber = string.Empty, InsuranceNumber = Value(row, "InsuranceNumber"), BloodType = Value(row, "BloodType"), PrimaryDoctorId = doctorId, CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor };
            db.Add<PatientProfile>(profile);
            await db.SaveChangesAsync(ct);
            profile.PatientNumber = $"PAT-{profile.Id:D5}";
            return true;
        });

    private static readonly ModuleDefinition AppointmentsDefinition = new(
        "Appointments",
        "appointments",
        ["Id", "PatientProfileId", "PatientName", "DoctorProfileId", "DoctorName", "DepartmentId", "DepartmentName", "ScheduledStart", "ScheduledEnd", "Status", "AppointmentType", "Reason"],
        ["PatientProfileId", "DoctorProfileId", "ScheduledStart", "ScheduledEnd"],
        async (db, filters, actor, permissions, ct) =>
        {
            var query = db.Query<Appointment>().AsNoTracking().AsQueryable();
            if (!permissions.Contains("Appointments.Read"))
                query = query.Where(x => x.PatientProfile.Person.UserId == actor);
            var status = filters.GetValueOrDefault("status");
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            var items = await query
                .Include(x => x.PatientProfile)
                .ThenInclude(x => x.Person)
                .Include(x => x.DoctorProfile)
                .ThenInclude(x => x.StaffProfile)
                .ThenInclude(x => x.Person)
                .Include(x => x.Department)
                .OrderBy(x => x.ScheduledStart)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("PatientProfileId", x.PatientProfileId.ToString()),
                ("PatientName", x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName),
                ("DoctorProfileId", x.DoctorProfileId.ToString()),
                ("DoctorName", x.DoctorProfile.StaffProfile.Person.FirstName + " " + x.DoctorProfile.StaffProfile.Person.LastName),
                ("DepartmentId", x.DepartmentId.HasValue ? x.DepartmentId.Value.ToString() : null),
                ("DepartmentName", x.Department == null ? null : x.Department.Name),
                ("ScheduledStart", FormatDate(x.ScheduledStart)),
                ("ScheduledEnd", FormatDate(x.ScheduledEnd)),
                ("Status", x.Status),
                ("AppointmentType", x.AppointmentType),
                ("Reason", x.Reason))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var patientId = IntValue(row, "PatientProfileId") ?? throw new BadRequestException("PatientProfileId is required.");
            var doctorId = IntValue(row, "DoctorProfileId") ?? throw new BadRequestException("DoctorProfileId is required.");
            var start = DateValue(row, "ScheduledStart") ?? throw new BadRequestException("ScheduledStart is required.");
            var end = DateValue(row, "ScheduledEnd") ?? throw new BadRequestException("ScheduledEnd is required.");
            var departmentId = IntValue(row, "DepartmentId");
            if (end <= start) throw new BadRequestException("ScheduledEnd must be after ScheduledStart.");
            if (!await db.Query<PatientProfile>().AnyAsync(x => x.Id == patientId, ct)) throw new BadRequestException("PatientProfileId does not exist.");
            if (!await db.Query<DoctorProfile>().AnyAsync(x => x.Id == doctorId, ct)) throw new BadRequestException("DoctorProfileId does not exist.");
            if (departmentId.HasValue && !await db.Query<Department>().AnyAsync(x => x.Id == departmentId.Value, ct)) throw new BadRequestException("DepartmentId does not exist.");
            if (await db.Query<Appointment>().AnyAsync(x => x.PatientProfileId == patientId && x.DoctorProfileId == doctorId && x.ScheduledStart == start, ct)) return false;
            if (await db.Query<Appointment>().AnyAsync(x => x.DoctorProfileId == doctorId && x.Status != AppointmentStatus.Cancelled && start < x.ScheduledEnd && end > x.ScheduledStart, ct)) throw new BadRequestException("Doctor has a conflicting appointment.");
            var now = DateTime.UtcNow;
            db.Add<Appointment>(new Appointment { PatientProfileId = patientId, DoctorProfileId = doctorId, DepartmentId = departmentId, ScheduledStart = start, ScheduledEnd = end, Status = AppointmentStatus.Scheduled, AppointmentType = Value(row, "AppointmentType"), Reason = Value(row, "Reason"), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static readonly ModuleDefinition PatientContactsDefinition = new(
        "Patient Contacts",
        "patient_contacts",
        ["Id", "PatientProfileId", "PatientNumber", "PatientName", "Name", "Relationship", "Phone", "Email", "IsPrimary", "CreatedAt", "UpdatedAt"],
        ["PatientProfileId", "Name", "Relationship", "Phone"],
        async (db, filters, _, _, ct) =>
        {
            var patientId = ParseNullableIntFilter(filters.GetValueOrDefault("patientProfileId"));
            var query = db.Query<PatientContact>().AsNoTracking().AsQueryable();
            if (patientId.HasValue) query = query.Where(x => x.PatientProfileId == patientId.Value);
            var items = await query
                .Include(x => x.PatientProfile)
                .ThenInclude(x => x.Person)
                .OrderBy(x => x.PatientProfile.PatientNumber)
                .ThenBy(x => x.Name)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("PatientProfileId", x.PatientProfileId.ToString()),
                ("PatientNumber", x.PatientProfile.PatientNumber),
                ("PatientName", x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName),
                ("Name", x.Name),
                ("Relationship", x.Relationship),
                ("Phone", x.Phone),
                ("Email", x.Email),
                ("IsPrimary", x.IsPrimary.ToString()),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var patientId = IntValue(row, "PatientProfileId") ?? throw new BadRequestException("PatientProfileId is required.");
            if (!await db.Query<PatientProfile>().AnyAsync(x => x.Id == patientId, ct)) throw new BadRequestException("PatientProfileId does not exist.");
            var name = Required(row, "Name");
            var phone = Required(row, "Phone");
            if (await db.Query<PatientContact>().AnyAsync(x => x.PatientProfileId == patientId && x.Name == name && x.Phone == phone, ct)) return false;
            var now = DateTime.UtcNow;
            db.Add<PatientContact>(new PatientContact { PatientProfileId = patientId, Name = name, Relationship = Required(row, "Relationship"), Phone = phone, Email = Value(row, "Email"), IsPrimary = BoolValue(row, "IsPrimary", false), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static readonly ModuleDefinition AppointmentRequestsDefinition = new(
        "Appointment Requests",
        "appointment_requests",
        ["Id", "FirstName", "LastName", "Email", "Phone", "DateOfBirth", "PreferredDate", "ReasonForVisit", "Status", "CreatedAt", "UpdatedAt"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var query = db.Query<AppointmentRequest>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
                query = query.Where(x => x.Status.ToString() == status);
            var items = await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("FirstName", x.FirstName),
                ("LastName", x.LastName),
                ("Email", x.Email),
                ("Phone", x.Phone),
                ("DateOfBirth", x.DateOfBirth.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                ("PreferredDate", x.PreferredDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                ("ReasonForVisit", x.ReasonForVisit),
                ("Status", x.Status.ToString()),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition LabRequestsDefinition = new(
        "Lab Requests",
        "lab_requests",
        ["Id", "RequestNumber", "EncounterId", "EncounterNumber", "PatientProfileId", "PatientName", "RequestedByDoctorId", "DoctorName", "Priority", "Status", "ClinicalNotes", "RequestedAt", "CollectedAt", "CompletedAt", "ItemCount"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var query = db.Query<LabRequest>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            var items = await query
                .Include(x => x.Encounter).ThenInclude(x => x.PatientProfile).ThenInclude(x => x.Person)
                .Include(x => x.RequestedByDoctor).ThenInclude(x => x.StaffProfile).ThenInclude(x => x.Person)
                .Include(x => x.Items)
                .OrderByDescending(x => x.RequestedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("RequestNumber", x.RequestNumber),
                ("EncounterId", x.EncounterId.ToString()),
                ("EncounterNumber", x.Encounter.EncounterNumber),
                ("PatientProfileId", x.Encounter.PatientProfileId.ToString()),
                ("PatientName", x.Encounter.PatientProfile.Person.FirstName + " " + x.Encounter.PatientProfile.Person.LastName),
                ("RequestedByDoctorId", x.RequestedByDoctorId.ToString()),
                ("DoctorName", x.RequestedByDoctor.StaffProfile.Person.FirstName + " " + x.RequestedByDoctor.StaffProfile.Person.LastName),
                ("Priority", x.Priority),
                ("Status", x.Status),
                ("ClinicalNotes", x.ClinicalNotes),
                ("RequestedAt", FormatDate(x.RequestedAt)),
                ("CollectedAt", x.CollectedAt.HasValue ? FormatDate(x.CollectedAt.Value) : null),
                ("CompletedAt", x.CompletedAt.HasValue ? FormatDate(x.CompletedAt.Value) : null),
                ("ItemCount", x.Items.Count.ToString()))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition LabResultsDefinition = new(
        "Lab Results",
        "lab_results",
        ["Id", "LabRequestItemId", "LabRequestId", "RequestNumber", "LabTestId", "LabTestName", "ResultData", "ReferenceRange", "Interpretation", "VerifiedByUserId", "VerifiedAt", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<LabResult>().AsNoTracking()
                .Include(x => x.LabRequestItem).ThenInclude(x => x.LabRequest)
                .Include(x => x.LabRequestItem).ThenInclude(x => x.LabTest)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("LabRequestItemId", x.LabRequestItemId.ToString()),
                ("LabRequestId", x.LabRequestItem.LabRequestId.ToString()),
                ("RequestNumber", x.LabRequestItem.LabRequest.RequestNumber),
                ("LabTestId", x.LabRequestItem.LabTestId.ToString()),
                ("LabTestName", x.LabRequestItem.LabTest.Name),
                ("ResultData", x.ResultData),
                ("ReferenceRange", x.ReferenceRange),
                ("Interpretation", x.Interpretation),
                ("VerifiedByUserId", x.VerifiedByUserId.HasValue ? x.VerifiedByUserId.Value.ToString() : null),
                ("VerifiedAt", x.VerifiedAt.HasValue ? FormatDate(x.VerifiedAt.Value) : null),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition EncountersDefinition = new(
        "Encounters",
        "encounters",
        ["Id", "EncounterNumber", "PatientProfileId", "PatientName", "DoctorProfileId", "DoctorName", "AppointmentId", "EncounterType", "StartedAt", "EndedAt", "ClosedAt", "Status", "Notes", "CreatedAt", "UpdatedAt"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var type = filters.GetValueOrDefault("type");
            var query = db.Query<Encounter>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            if (!string.IsNullOrWhiteSpace(type) && !type.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.EncounterType == type);
            var items = await query
                .Include(x => x.PatientProfile).ThenInclude(x => x.Person)
                .Include(x => x.DoctorProfile).ThenInclude(x => x.StaffProfile).ThenInclude(x => x.Person)
                .OrderByDescending(x => x.StartedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("EncounterNumber", x.EncounterNumber),
                ("PatientProfileId", x.PatientProfileId.ToString()),
                ("PatientName", x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName),
                ("DoctorProfileId", x.DoctorProfileId.ToString()),
                ("DoctorName", x.DoctorProfile.StaffProfile.Person.FirstName + " " + x.DoctorProfile.StaffProfile.Person.LastName),
                ("AppointmentId", x.AppointmentId.HasValue ? x.AppointmentId.Value.ToString() : null),
                ("EncounterType", x.EncounterType),
                ("StartedAt", FormatDate(x.StartedAt)),
                ("EndedAt", x.EndedAt.HasValue ? FormatDate(x.EndedAt.Value) : null),
                ("ClosedAt", x.ClosedAt.HasValue ? FormatDate(x.ClosedAt.Value) : null),
                ("Status", x.Status),
                ("Notes", x.Notes),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition DiagnosesDefinition = new(
        "Diagnoses",
        "diagnoses",
        ["Id", "EncounterId", "EncounterNumber", "CreatedByDoctorId", "DoctorName", "IcdCode", "Description", "Type", "Notes", "DiagnosedAt", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<Diagnosis>().AsNoTracking()
                .Include(x => x.Encounter)
                .Include(x => x.CreatedByDoctor).ThenInclude(x => x.StaffProfile).ThenInclude(x => x.Person)
                .OrderByDescending(x => x.DiagnosedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("EncounterId", x.EncounterId.ToString()),
                ("EncounterNumber", x.Encounter.EncounterNumber),
                ("CreatedByDoctorId", x.CreatedByDoctorId.ToString()),
                ("DoctorName", x.CreatedByDoctor.StaffProfile.Person.FirstName + " " + x.CreatedByDoctor.StaffProfile.Person.LastName),
                ("IcdCode", x.IcdCode),
                ("Description", x.Description),
                ("Type", x.Type),
                ("Notes", x.Notes),
                ("DiagnosedAt", FormatDate(x.DiagnosedAt)),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition PrescriptionsDefinition = new(
        "Prescriptions",
        "prescriptions",
        ["Id", "EncounterId", "EncounterNumber", "PrescribedByDoctorId", "DoctorName", "Status", "Notes", "ItemCount", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<Prescription>().AsNoTracking()
                .Include(x => x.Encounter)
                .Include(x => x.PrescribedByDoctor).ThenInclude(x => x.StaffProfile).ThenInclude(x => x.Person)
                .Include(x => x.Items)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("EncounterId", x.EncounterId.ToString()),
                ("EncounterNumber", x.Encounter.EncounterNumber),
                ("PrescribedByDoctorId", x.PrescribedByDoctorId.ToString()),
                ("DoctorName", x.PrescribedByDoctor.StaffProfile.Person.FirstName + " " + x.PrescribedByDoctor.StaffProfile.Person.LastName),
                ("Status", x.Status),
                ("Notes", x.Notes),
                ("ItemCount", x.Items.Count.ToString()),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition NurseTasksDefinition = new(
        "Nurse Tasks",
        "nurse_tasks",
        ["Id", "EncounterId", "EncounterNumber", "AssignedByDoctorId", "DoctorName", "AssignedToNurseId", "NurseName", "Type", "Priority", "Status", "Notes", "DueAt", "CompletedAt", "CreatedAt", "UpdatedAt"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var query = db.Query<NurseTask>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            var items = await query
                .Include(x => x.Encounter)
                .Include(x => x.AssignedByDoctor).ThenInclude(x => x.StaffProfile).ThenInclude(x => x.Person)
                .Include(x => x.AssignedToNurse).ThenInclude(x => x!.StaffProfile).ThenInclude(x => x.Person)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("EncounterId", x.EncounterId.ToString()),
                ("EncounterNumber", x.Encounter.EncounterNumber),
                ("AssignedByDoctorId", x.AssignedByDoctorId.ToString()),
                ("DoctorName", x.AssignedByDoctor.StaffProfile.Person.FirstName + " " + x.AssignedByDoctor.StaffProfile.Person.LastName),
                ("AssignedToNurseId", x.AssignedToNurseId.HasValue ? x.AssignedToNurseId.Value.ToString() : null),
                ("NurseName", x.AssignedToNurse == null ? null : x.AssignedToNurse.StaffProfile.Person.FirstName + " " + x.AssignedToNurse.StaffProfile.Person.LastName),
                ("Type", x.Type),
                ("Priority", x.Priority),
                ("Status", x.Status),
                ("Notes", x.Notes),
                ("DueAt", x.DueAt.HasValue ? FormatDate(x.DueAt.Value) : null),
                ("CompletedAt", x.CompletedAt.HasValue ? FormatDate(x.CompletedAt.Value) : null),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition BedAssignmentsDefinition = new(
        "Bed Assignments",
        "bed_assignments",
        ["Id", "BedId", "BedLocation", "PatientProfileId", "PatientName", "EncounterId", "AssignedAt", "AssignedByUserId", "ReleasedAt", "ReleasedByUserId", "Notes", "ReleaseNotes", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<BedAssignment>().AsNoTracking()
                .Include(x => x.Bed)
                .Include(x => x.PatientProfile).ThenInclude(x => x.Person)
                .OrderByDescending(x => x.AssignedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("BedId", x.BedId.ToString()),
                ("BedLocation", $"{x.Bed.Ward} / {x.Bed.RoomNumber} / {x.Bed.BedNumber}"),
                ("PatientProfileId", x.PatientProfileId.ToString()),
                ("PatientName", x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName),
                ("EncounterId", x.EncounterId.HasValue ? x.EncounterId.Value.ToString() : null),
                ("AssignedAt", FormatDate(x.AssignedAt)),
                ("AssignedByUserId", x.AssignedByUserId.ToString()),
                ("ReleasedAt", x.ReleasedAt.HasValue ? FormatDate(x.ReleasedAt.Value) : null),
                ("ReleasedByUserId", x.ReleasedByUserId.HasValue ? x.ReleasedByUserId.Value.ToString() : null),
                ("Notes", x.Notes),
                ("ReleaseNotes", x.ReleaseNotes),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition BedAssignmentRequestsDefinition = new(
        "Bed Assignment Requests",
        "bed_assignment_requests",
        ["Id", "EncounterId", "PatientProfileId", "PatientName", "RequestedByDoctorId", "DoctorName", "Status", "Priority", "PreferredWard", "Notes", "RequestedAt", "ResolvedAt", "ResolvedByUserId", "BedAssignmentId", "CreatedAt", "UpdatedAt"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var query = db.Query<BedAssignmentRequest>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            var items = await query
                .Include(x => x.PatientProfile).ThenInclude(x => x.Person)
                .Include(x => x.RequestedByDoctor).ThenInclude(x => x.StaffProfile).ThenInclude(x => x.Person)
                .OrderByDescending(x => x.RequestedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("EncounterId", x.EncounterId.ToString()),
                ("PatientProfileId", x.PatientProfileId.ToString()),
                ("PatientName", x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName),
                ("RequestedByDoctorId", x.RequestedByDoctorId.ToString()),
                ("DoctorName", x.RequestedByDoctor.StaffProfile.Person.FirstName + " " + x.RequestedByDoctor.StaffProfile.Person.LastName),
                ("Status", x.Status),
                ("Priority", x.Priority),
                ("PreferredWard", x.PreferredWard),
                ("Notes", x.Notes),
                ("RequestedAt", FormatDate(x.RequestedAt)),
                ("ResolvedAt", x.ResolvedAt.HasValue ? FormatDate(x.ResolvedAt.Value) : null),
                ("ResolvedByUserId", x.ResolvedByUserId.HasValue ? x.ResolvedByUserId.Value.ToString() : null),
                ("BedAssignmentId", x.BedAssignmentId.HasValue ? x.BedAssignmentId.Value.ToString() : null),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition InvoicesDefinition = new(
        "Invoices",
        "invoices",
        ["Id", "InvoiceNumber", "PatientProfileId", "PatientName", "EncounterId", "Currency", "SubtotalAmount", "DiscountAmount", "TaxAmount", "TotalAmount", "Status", "IssuedAt", "DueAt", "CreatedAt", "UpdatedAt"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var query = db.Query<Invoice>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            var items = await query
                .Include(x => x.PatientProfile).ThenInclude(x => x.Person)
                .OrderByDescending(x => x.IssuedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("InvoiceNumber", x.InvoiceNumber),
                ("PatientProfileId", x.PatientProfileId.ToString()),
                ("PatientName", x.PatientProfile.Person.FirstName + " " + x.PatientProfile.Person.LastName),
                ("EncounterId", x.EncounterId.HasValue ? x.EncounterId.Value.ToString() : null),
                ("Currency", x.Currency),
                ("SubtotalAmount", x.SubtotalAmount.ToString(CultureInfo.InvariantCulture)),
                ("DiscountAmount", x.DiscountAmount.ToString(CultureInfo.InvariantCulture)),
                ("TaxAmount", x.TaxAmount.ToString(CultureInfo.InvariantCulture)),
                ("TotalAmount", x.TotalAmount.ToString(CultureInfo.InvariantCulture)),
                ("Status", x.Status),
                ("IssuedAt", FormatDate(x.IssuedAt)),
                ("DueAt", x.DueAt.HasValue ? FormatDate(x.DueAt.Value) : null),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition InvoiceItemsDefinition = new(
        "Invoice Items",
        "invoice_items",
        ["Id", "InvoiceId", "InvoiceNumber", "Description", "Quantity", "UnitPrice", "TotalPrice", "SourceType", "SourceId", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<InvoiceItem>().AsNoTracking()
                .Include(x => x.Invoice)
                .OrderByDescending(x => x.Invoice.IssuedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("InvoiceId", x.InvoiceId.ToString()),
                ("InvoiceNumber", x.Invoice.InvoiceNumber),
                ("Description", x.Description),
                ("Quantity", x.Quantity.ToString(CultureInfo.InvariantCulture)),
                ("UnitPrice", x.UnitPrice.ToString(CultureInfo.InvariantCulture)),
                ("TotalPrice", x.TotalPrice.ToString(CultureInfo.InvariantCulture)),
                ("SourceType", x.SourceType),
                ("SourceId", x.SourceId.HasValue ? x.SourceId.Value.ToString() : null),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition PaymentsDefinition = new(
        "Payments",
        "payments",
        ["Id", "InvoiceId", "InvoiceNumber", "Amount", "PaymentMethod", "Status", "PaidAt", "TransactionReference", "ReceivedByUserId", "CreatedAt", "UpdatedAt"],
        [],
        async (db, filters, _, _, ct) =>
        {
            var status = filters.GetValueOrDefault("status");
            var query = db.Query<Payment>().AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase)) query = query.Where(x => x.Status == status);
            var items = await query
                .Include(x => x.Invoice)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("InvoiceId", x.InvoiceId.ToString()),
                ("InvoiceNumber", x.Invoice.InvoiceNumber),
                ("Amount", x.Amount.ToString(CultureInfo.InvariantCulture)),
                ("PaymentMethod", x.PaymentMethod),
                ("Status", x.Status),
                ("PaidAt", x.PaidAt.HasValue ? FormatDate(x.PaidAt.Value) : null),
                ("TransactionReference", x.TransactionReference),
                ("ReceivedByUserId", x.ReceivedByUserId.HasValue ? x.ReceivedByUserId.Value.ToString() : null),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition UsersDefinition = new(
        "Users",
        "users",
        ["Id", "UserName", "Email", "IsActive", "EmailVerifiedAt", "LastLoginAt", "Roles", "PersonId", "PersonName", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<User>().AsNoTracking()
                .Include(x => x.UserRoles).ThenInclude(x => x.Role)
                .Include(x => x.Person)
                .OrderBy(x => x.UserName)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("UserName", x.UserName),
                ("Email", x.Email),
                ("IsActive", x.IsActive.ToString()),
                ("EmailVerifiedAt", x.EmailVerifiedAt.HasValue ? FormatDate(x.EmailVerifiedAt.Value) : null),
                ("LastLoginAt", x.LastLoginAt.HasValue ? FormatDate(x.LastLoginAt.Value) : null),
                ("Roles", string.Join("; ", x.UserRoles.Select(ur => ur.Role.Name).OrderBy(name => name))),
                ("PersonId", x.Person == null ? null : x.Person.Id.ToString()),
                ("PersonName", x.Person == null ? null : x.Person.FirstName + " " + x.Person.LastName),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition StaffDefinition = new(
        "Staff",
        "staff",
        ["Id", "StaffNumber", "PersonId", "FirstName", "LastName", "Phone", "DepartmentId", "DepartmentName", "EmploymentStatus", "HireDate", "StaffType", "LicenseNumber", "IsActive", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<StaffProfile>().AsNoTracking()
                .Include(x => x.Person)
                .Include(x => x.Department)
                .Include(x => x.DoctorProfile)
                .Include(x => x.NurseProfile)
                .OrderBy(x => x.Person.LastName)
                .ThenBy(x => x.Person.FirstName)
                .ToListAsync(ct);
            return items.Select(x =>
            {
                var isDoctor = x.DoctorProfile != null;
                var isNurse = x.NurseProfile != null;
                return Row(
                    ("Id", x.Id.ToString()),
                    ("StaffNumber", x.StaffNumber),
                    ("PersonId", x.PersonId.ToString()),
                    ("FirstName", x.Person.FirstName),
                    ("LastName", x.Person.LastName),
                    ("Phone", x.Person.Phone),
                    ("DepartmentId", x.DepartmentId.HasValue ? x.DepartmentId.Value.ToString() : null),
                    ("DepartmentName", x.Department?.Name),
                    ("EmploymentStatus", x.EmploymentStatus),
                    ("HireDate", x.HireDate.HasValue ? FormatDate(x.HireDate.Value) : null),
                    ("StaffType", isDoctor ? "Doctor" : isNurse ? "Nurse" : "General"),
                    ("LicenseNumber", isDoctor ? x.DoctorProfile!.LicenseNumber : isNurse ? x.NurseProfile!.LicenseNumber : null),
                    ("IsActive", isDoctor ? x.DoctorProfile!.IsActive.ToString() : isNurse ? x.NurseProfile!.IsActive.ToString() : null),
                    ("CreatedAt", FormatDate(x.CreatedAt)),
                    ("UpdatedAt", FormatDate(x.UpdatedAt)));
            }).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition RolesDefinition = new(
        "Roles",
        "roles",
        ["Id", "Name", "Description", "Permissions", "CreatedAt", "UpdatedAt"],
        ["Name"],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<Role>().AsNoTracking()
                .Include(x => x.RolePermissions).ThenInclude(x => x.Permission)
                .OrderBy(x => x.Name)
                .ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("Name", x.Name),
                ("Description", x.Description),
                ("Permissions", string.Join("; ", x.RolePermissions.Select(rp => rp.Permission.Name).OrderBy(name => name))),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var name = Required(row, "Name");
            if (await db.Query<Role>().AnyAsync(x => x.Name == name, ct)) return false;
            var now = DateTime.UtcNow;
            db.Add<Role>(new Role { Name = name, Description = Value(row, "Description") ?? string.Empty, CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static readonly ModuleDefinition PermissionsDefinition = new(
        "Permissions",
        "permissions",
        ["Id", "Name", "Description", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<Permission>().AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("Name", x.Name),
                ("Description", x.Description),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition SettingsDefinition = new(
        "Settings",
        "settings",
        ["Id", "Key", "Value", "Description", "UpdatedAt"],
        ["Key", "Value"],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<Setting>().AsNoTracking().OrderBy(x => x.Key).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("Key", x.Key),
                ("Value", x.Value),
                ("Description", x.Description),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, _, ct) =>
        {
            var key = Required(row, "Key");
            if (await db.Query<Setting>().AnyAsync(x => x.Key == key, ct)) return false;
            db.Add<Setting>(new Setting { Key = key, Value = Required(row, "Value"), Description = Value(row, "Description"), UpdatedAt = DateTime.UtcNow });
            return true;
        });

    private static readonly ModuleDefinition AuditLogsDefinition = new(
        "Audit Logs",
        "audit_logs",
        ["Id", "UserId", "Action", "Entity", "EntityId", "OldValue", "NewValue", "IpAddress", "CreatedAt", "UpdatedAt"],
        [],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<AuditLog>().AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("UserId", x.UserId.HasValue ? x.UserId.Value.ToString() : null),
                ("Action", x.Action),
                ("Entity", x.Entity),
                ("EntityId", x.EntityId.HasValue ? x.EntityId.Value.ToString() : null),
                ("OldValue", x.OldValue),
                ("NewValue", x.NewValue),
                ("IpAddress", x.IpAddress),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        ExportOnlyImport);

    private static readonly ModuleDefinition DepartmentsDefinition = new(
        "Departments",
        "departments",
        ["Id", "Name", "Description", "CreatedAt", "UpdatedAt"],
        ["Name"],
        async (db, _, __, ___, ct) =>
        {
            var items = await db.Query<Department>().AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
            return items.Select(x => Row(
                ("Id", x.Id.ToString()),
                ("Name", x.Name),
                ("Description", x.Description),
                ("CreatedAt", FormatDate(x.CreatedAt)),
                ("UpdatedAt", FormatDate(x.UpdatedAt)))).ToList();
        },
        async (db, row, actor, ct) =>
        {
            var name = Required(row, "Name");
            if (await db.Query<Department>().AnyAsync(x => x.Name == name, ct)) return false;
            var now = DateTime.UtcNow;
            db.Add<Department>(new Department { Name = name, Description = Value(row, "Description"), CreatedAt = now, UpdatedAt = now, CreatedById = actor, UpdatedById = actor });
            return true;
        });

    private static bool? ParseNullableBoolFilter(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value == "all") return null;
        return bool.TryParse(value, out var parsed) ? parsed : null;
    }

    private static int? ParseNullableIntFilter(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value == "all") return null;
        return int.TryParse(value, out var parsed) ? parsed : null;
    }

    private static string FormatDate(DateTime value)
    {
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
    }

    private static Dictionary<string, string?> Row(params (string Key, string? Value)[] values)
    {
        return values.ToDictionary(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase);
    }
}
