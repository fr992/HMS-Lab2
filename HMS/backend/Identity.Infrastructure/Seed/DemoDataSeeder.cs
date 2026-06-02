using HMS.Domain.Entities;
using HMS.Persistence;
using Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Identity.Infrastructure.Seed;

public sealed class DemoDataSeeder
{
    public const string SeedPrefix = "DEMO-SEED";

    private const int DefaultCount = 1200;
    private const int MinCount = 1000;
    private const int MaxCount = 2500;
    private const string DemoPassword = "DemoPass123!";

    private readonly HmsDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<DemoDataSeeder> _logger;

    private readonly Random _random = new(42024);

    private static readonly string[] FirstNames =
    [
        "Alex", "Mira", "Noah", "Elena", "Arben", "Sara", "Jon", "Nora",
        "Luan", "Drita", "Dion", "Lea", "Amir", "Vesa", "Ben", "Tara"
    ];

    private static readonly string[] LastNames =
    [
        "Krasniqi", "Berisha", "Hoxha", "Gashi", "Smith", "Johnson", "Brown",
        "Garcia", "Wilson", "Davis", "Taylor", "Miller", "Moore", "Clark"
    ];

    private static readonly string[] Departments =
    [
        "Cardiology", "Neurology", "Pediatrics", "Emergency", "Orthopedics",
        "Radiology", "Oncology", "Surgery", "Internal Medicine", "Laboratory"
    ];

    private static readonly string[] Specializations =
    [
        "Cardiologist", "Neurologist", "Pediatrician", "Emergency Physician",
        "Orthopedic Surgeon", "Radiologist", "Oncologist", "General Surgeon"
    ];

    private static readonly string[] BloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    private static readonly string[] AppointmentTypes = ["Consultation", "Follow-up", "Check-up", "Procedure", "Review"];
    private static readonly string[] PaymentMethods = ["cash", "card", "bank_transfer", "insurance", "online"];
    private static readonly string[] Wards = ["ICU", "Emergency", "General Ward", "Pediatrics", "Surgery", "Recovery"];
    private static readonly string[] TaskTypes = ["Vitals", "Medication", "Wound care", "Mobility check", "Discharge prep"];

    public DemoDataSeeder(
        HmsDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILogger<DemoDataSeeder> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task SeedAsync(int? requestedCount = null, CancellationToken cancellationToken = default)
    {
        var count = NormalizeCount(requestedCount);

        if (await _db.Users.AnyAsync(user => user.UserName.StartsWith(SeedPrefix), cancellationToken))
        {
            _logger.LogWarning("Demo data already exists. Run rollback first if you want a fresh demo data set.");
            return;
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var now = DateTime.UtcNow;
        _logger.LogInformation("Seeding demo data with {Count} rows per high-volume area.", count);

        var roleIds = await _db.Roles
            .Where(role => role.Name == "Doctor" || role.Name == "Nurse" || role.Name == "Patient" || role.Name == "Receptionist" || role.Name == "Laboratorant")
            .ToDictionaryAsync(role => role.Name, role => role.Id, cancellationToken);

        var adminUserId = await _db.Users
            .OrderBy(user => user.Id)
            .Select(user => (int?)user.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (roleIds.Count == 0 || adminUserId is null)
            throw new InvalidOperationException("Run the normal identity seed first so roles and an admin user exist.");

        var departments = await AddDepartmentsAsync(count, now, cancellationToken);
        var specializations = await AddSpecializationsAsync(count, now, cancellationToken);
        var medications = await AddMedicationsAsync(count, now, cancellationToken);
        var labTests = await AddLabTestsAsync(count, now, cancellationToken);
        var files = await AddFilesAsync(count, now, cancellationToken);

        var doctors = await AddStaffUsersAsync("doctor", count, roleIds["Doctor"], departments, specializations, now, cancellationToken);
        var nurses = await AddNurseUsersAsync("nurse", count, roleIds["Nurse"], departments, now, cancellationToken);
        await AddOperationalUsersAsync("reception", count, roleIds["Receptionist"], departments, now, cancellationToken);
        await AddOperationalUsersAsync("lab", count, roleIds["Laboratorant"], departments, now, cancellationToken);

        var patients = await AddPatientsAsync(count, roleIds["Patient"], doctors, now, cancellationToken);
        await AddPatientContactsAsync(count, patients, now, cancellationToken);
        await AddAppointmentRequestsAsync(count, now, cancellationToken);
        var appointments = await AddAppointmentsAsync(count, patients, doctors, departments, now, cancellationToken);
        var encounters = await AddEncountersAsync(count, patients, doctors, appointments, adminUserId.Value, now, cancellationToken);
        await AddDiagnosesAsync(count, encounters, doctors, now, cancellationToken);
        var prescriptions = await AddPrescriptionsAsync(count, encounters, doctors, now, cancellationToken);
        await AddPrescriptionItemsAsync(count, prescriptions, medications, now, cancellationToken);
        var labRequests = await AddLabRequestsAsync(count, encounters, doctors, now, cancellationToken);
        var labRequestItems = await AddLabRequestItemsAsync(count, labRequests, labTests, now, cancellationToken);
        await AddLabResultsAsync(count, labRequestItems, files, adminUserId.Value, now, cancellationToken);
        await AddNurseTasksAsync(count, encounters, doctors, nurses, adminUserId.Value, now, cancellationToken);
        var beds = await AddBedsAsync(count, departments, now, cancellationToken);
        var bedAssignments = await AddBedAssignmentsAsync(count, beds, patients, encounters, adminUserId.Value, now, cancellationToken);
        await AddBedAssignmentRequestsAsync(count, encounters, patients, doctors, bedAssignments, adminUserId.Value, now, cancellationToken);
        var invoices = await AddInvoicesAsync(count, patients, encounters, now, cancellationToken);
        await AddInvoiceItemsAsync(count, invoices, now, cancellationToken);
        await AddPaymentsAsync(count, invoices, adminUserId.Value, now, cancellationToken);
        await AddSettingsAsync(count, now, cancellationToken);
        await AddAuditLogsAsync(count, adminUserId.Value, now, cancellationToken);
        await AddRefreshTokensAsync(count, now, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        _logger.LogInformation("Demo data seed complete. Prefix: {SeedPrefix}.", SeedPrefix);
    }

    public async Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        // 1. Identify invoices first (SOURCE OF TRUTH)
        var invoiceIds = await _db.Invoices
            .Where(x => x.InvoiceNumber.StartsWith(SeedPrefix))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        // 2. Payments (FK child of invoices)
        await _db.Payments
            .Where(x => invoiceIds.Contains(x.InvoiceId) || x.TransactionReference!.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        // 3. Invoice items
        await _db.InvoiceItems
            .Where(x => x.SourceType == SeedPrefix)
            .ExecuteDeleteAsync(cancellationToken);

        // 4. Invoices
        await _db.Invoices
            .Where(x => invoiceIds.Contains(x.Id))
            .ExecuteDeleteAsync(cancellationToken);

        // 5. Everything else SAFE string-based deletes
        await _db.AuditLogs
            .Where(x => x.Action.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.RefreshTokens
            .Where(x => x.TokenHash.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.LabResults
            .Where(x => x.Interpretation != null && x.Interpretation.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.LabRequestItems
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.LabRequests
            .Where(x => x.RequestNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.PrescriptionItems
            .Where(x => x.Instructions != null && x.Instructions.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Prescriptions
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Diagnoses
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.NurseTasks
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.BedAssignmentRequests
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.BedAssignments
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Beds
            .Where(x => x.Notes != null && x.Notes.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Encounters
            .Where(x => x.EncounterNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Appointments
            .Where(x => x.Reason != null && x.Reason.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.AppointmentRequests
            .Where(x => x.Email.StartsWith("demo-request-") || x.ReasonForVisit.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.PatientContacts
            .Where(x => x.Email != null && x.Email.StartsWith("demo-contact-"))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.PatientProfiles
            .Where(x => x.PatientNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.UserRoles
            .Where(x => x.User.UserName.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.DoctorProfiles
            .Where(x => x.LicenseNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.NurseProfiles
            .Where(x => x.LicenseNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.StaffProfiles
            .Where(x => x.StaffNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.People
            .Where(x => x.PersonalNumber != null && x.PersonalNumber.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Users
            .Where(x => x.UserName.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Files
            .Where(x => x.StoredFileName.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.LabTests
            .Where(x => x.TestCode != null && x.TestCode.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Medications
            .Where(x => x.Name.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Settings
            .Where(x => x.Key.StartsWith("demo."))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Set<Department>()
            .Where(x => x.Name.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Set<Specialization>()
            .Where(x => x.Name.StartsWith(SeedPrefix))
            .ExecuteDeleteAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        _logger.LogWarning("Demo data rollback complete.");
    }
    private static int NormalizeCount(int? requestedCount) =>
        Math.Clamp(requestedCount ?? DefaultCount, MinCount, MaxCount);

    private async Task<List<Department>> AddDepartmentsAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new Department
            {
                Name = $"{SeedPrefix} Department {i:D4}",
                Description = $"{Departments[(i - 1) % Departments.Length]} demo department",
                CreatedAt = now.AddDays(-i % 365),
                UpdatedAt = now
            })
            .ToList();

        _db.Set<Department>().AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<Specialization>> AddSpecializationsAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new Specialization
            {
                Name = $"{SeedPrefix} Specialization {i:D4}",
                Description = Specializations[(i - 1) % Specializations.Length],
                CreatedAt = now.AddDays(-i % 365),
                UpdatedAt = now
            })
            .ToList();

        _db.Set<Specialization>().AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<Medication>> AddMedicationsAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new Medication
            {
                Name = $"{SeedPrefix} Medication {i:D4}",
                Description = "Generated demo medication for load and workflow testing.",
                IsActive = i % 19 != 0,
                CreatedAt = now.AddDays(-i % 500),
                UpdatedAt = now
            })
            .ToList();

        _db.Medications.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<LabTest>> AddLabTestsAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var specimens = new[] { "Blood", "Urine", "Serum", "Plasma", "Swab" };
        var items = Enumerable.Range(1, count)
            .Select(i => new LabTest
            {
                TestCode = $"{SeedPrefix}-LT-{i:D5}",
                Name = $"{SeedPrefix} Lab Test {i:D4}",
                SpecimenType = specimens[i % specimens.Length],
                Description = "Generated demo lab test.",
                Price = 15 + (i % 180),
                IsActive = i % 23 != 0,
                CreatedAt = now.AddDays(-i % 500),
                UpdatedAt = now
            })
            .ToList();

        _db.LabTests.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<HmsFile>> AddFilesAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new HmsFile
            {
                OriginalFileName = $"demo-result-{i:D5}.pdf",
                StoredFileName = $"{SeedPrefix}-file-{i:D5}.pdf",
                ContentType = "application/pdf",
                SizeBytes = 25_000 + i,
                StoragePath = $"demo/{SeedPrefix}/demo-result-{i:D5}.pdf",
                CreatedAt = now.AddDays(-i % 120),
                UpdatedAt = now
            })
            .ToList();

        _db.Files.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<DoctorProfile>> AddStaffUsersAsync(
        string kind,
        int count,
        int roleId,
        IReadOnlyList<Department> departments,
        IReadOnlyList<Specialization> specializations,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var doctors = new List<DoctorProfile>(count);
        for (var i = 1; i <= count; i++)
        {
            var user = NewUser($"{kind}{i:D5}", now);
            var person = NewPerson(user, $"{kind}-{i:D5}", i, now);
            var staff = new StaffProfile
            {
                Person = person,
                StaffNumber = $"{SeedPrefix}-{kind.ToUpperInvariant()}-{i:D5}",
                DepartmentId = Pick(departments, i).Id,
                EmploymentStatus = i % 17 == 0 ? "part_time" : "active",
                HireDate = now.Date.AddDays(-(i % 3000)),
                CreatedAt = now.AddDays(-i % 700),
                UpdatedAt = now
            };
            var doctor = new DoctorProfile
            {
                StaffProfile = staff,
                SpecializationId = Pick(specializations, i).Id,
                LicenseNumber = $"{SeedPrefix}-DR-LIC-{i:D5}",
                IsActive = i % 29 != 0,
                CreatedAt = now.AddDays(-i % 700),
                UpdatedAt = now
            };
            _db.Users.Add(user);
            _db.UserRoles.Add(NewUserRole(user, roleId, now));
            doctors.Add(doctor);
        }

        _db.DoctorProfiles.AddRange(doctors);
        await _db.SaveChangesAsync(cancellationToken);
        return doctors;
    }

    private async Task<List<NurseProfile>> AddNurseUsersAsync(
        string kind,
        int count,
        int roleId,
        IReadOnlyList<Department> departments,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var nurses = new List<NurseProfile>(count);
        for (var i = 1; i <= count; i++)
        {
            var user = NewUser($"{kind}{i:D5}", now);
            var person = NewPerson(user, $"{kind}-{i:D5}", i, now);
            var staff = new StaffProfile
            {
                Person = person,
                StaffNumber = $"{SeedPrefix}-{kind.ToUpperInvariant()}-{i:D5}",
                DepartmentId = Pick(departments, i).Id,
                EmploymentStatus = i % 13 == 0 ? "part_time" : "active",
                HireDate = now.Date.AddDays(-(i % 2800)),
                CreatedAt = now.AddDays(-i % 700),
                UpdatedAt = now
            };
            var nurse = new NurseProfile
            {
                StaffProfile = staff,
                LicenseNumber = $"{SeedPrefix}-NR-LIC-{i:D5}",
                IsActive = i % 31 != 0,
                CreatedAt = now.AddDays(-i % 700),
                UpdatedAt = now
            };
            _db.Users.Add(user);
            _db.UserRoles.Add(NewUserRole(user, roleId, now));
            nurses.Add(nurse);
        }

        _db.NurseProfiles.AddRange(nurses);
        await _db.SaveChangesAsync(cancellationToken);
        return nurses;
    }

    private async Task AddOperationalUsersAsync(
        string kind,
        int count,
        int roleId,
        IReadOnlyList<Department> departments,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var staffProfiles = new List<StaffProfile>(count);
        for (var i = 1; i <= count; i++)
        {
            var user = NewUser($"{kind}{i:D5}", now);
            var person = NewPerson(user, $"{kind}-{i:D5}", i, now);
            staffProfiles.Add(new StaffProfile
            {
                Person = person,
                StaffNumber = $"{SeedPrefix}-{kind.ToUpperInvariant()}-{i:D5}",
                DepartmentId = Pick(departments, i).Id,
                EmploymentStatus = i % 21 == 0 ? "part_time" : "active",
                HireDate = now.Date.AddDays(-(i % 2400)),
                CreatedAt = now.AddDays(-i % 700),
                UpdatedAt = now
            });
            _db.Users.Add(user);
            _db.UserRoles.Add(NewUserRole(user, roleId, now));
        }

        _db.StaffProfiles.AddRange(staffProfiles);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<PatientProfile>> AddPatientsAsync(
        int count,
        int roleId,
        IReadOnlyList<DoctorProfile> doctors,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var patients = new List<PatientProfile>(count);
        for (var i = 1; i <= count; i++)
        {
            var user = NewUser($"patient{i:D5}", now);
            var person = NewPerson(user, $"patient-{i:D5}", i, now);
            var patient = new PatientProfile
            {
                Person = person,
                PatientNumber = $"{SeedPrefix}-PT-{i:D5}",
                InsuranceNumber = $"{SeedPrefix}-INS-{i:D5}",
                BloodType = BloodTypes[i % BloodTypes.Length],
                PrimaryDoctorId = Pick(doctors, i).Id,
                CreatedAt = now.AddDays(-i % 900),
                UpdatedAt = now
            };
            _db.Users.Add(user);
            _db.UserRoles.Add(NewUserRole(user, roleId, now));
            patients.Add(patient);
        }

        _db.PatientProfiles.AddRange(patients);
        await _db.SaveChangesAsync(cancellationToken);
        return patients;
    }

    private async Task AddPatientContactsAsync(int count, IReadOnlyList<PatientProfile> patients, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new PatientContact
            {
                PatientProfileId = Pick(patients, i).Id,
                Name = $"{FirstNames[i % FirstNames.Length]} {LastNames[(i + 3) % LastNames.Length]}",
                Relationship = i % 2 == 0 ? "Spouse" : "Parent",
                Phone = $"+383441{i:D5}",
                Email = $"demo-contact-{i:D5}@hms.local",
                IsPrimary = i % 3 == 0,
                CreatedAt = now.AddDays(-i % 300),
                UpdatedAt = now
            })
            .ToList();

        _db.PatientContacts.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AddAppointmentRequestsAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = Enum.GetValues<AppointmentRequestStatus>();
        var items = Enumerable.Range(1, count)
            .Select(i => new AppointmentRequest
            {
                FirstName = FirstNames[i % FirstNames.Length],
                LastName = LastNames[i % LastNames.Length],
                Email = $"demo-request-{i:D5}@hms.local",
                Phone = $"+383455{i:D5}",
                DateOfBirth = DateOnly.FromDateTime(now.Date.AddYears(-20 - i % 60)),
                PreferredDate = DateOnly.FromDateTime(now.Date.AddDays(i % 90)),
                ReasonForVisit = $"{SeedPrefix} generated online request {i:D5}",
                Status = statuses[i % statuses.Length],
                CreatedAt = now.AddDays(-i % 180),
                UpdatedAt = now
            })
            .ToList();

        _db.AppointmentRequests.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<Appointment>> AddAppointmentsAsync(
        int count,
        IReadOnlyList<PatientProfile> patients,
        IReadOnlyList<DoctorProfile> doctors,
        IReadOnlyList<Department> departments,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var statuses = new[] { AppointmentStatus.Scheduled, AppointmentStatus.Confirmed, AppointmentStatus.Completed, AppointmentStatus.Cancelled, AppointmentStatus.NoShow };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var start = now.Date.AddDays((i % 120) - 60).AddMinutes((i % 30) * 20);
                var status = statuses[i % statuses.Length];
                return new Appointment
                {
                    PatientProfileId = Pick(patients, i).Id,
                    DoctorProfileId = Pick(doctors, i).Id,
                    DepartmentId = Pick(departments, i).Id,
                    ScheduledStart = start,
                    ScheduledEnd = start.AddMinutes(30),
                    Status = status,
                    AppointmentType = AppointmentTypes[i % AppointmentTypes.Length],
                    Reason = $"{SeedPrefix} appointment reason {i:D5}",
                    ConfirmedAt = status is AppointmentStatus.Confirmed or AppointmentStatus.Completed ? start.AddDays(-1) : null,
                    CancelledAt = status == AppointmentStatus.Cancelled ? start.AddHours(-4) : null,
                    CancellationReason = status == AppointmentStatus.Cancelled ? $"{SeedPrefix} cancelled for demo" : null,
                    CreatedAt = now.AddDays(-i % 365),
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.Appointments.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<Encounter>> AddEncountersAsync(
        int count,
        IReadOnlyList<PatientProfile> patients,
        IReadOnlyList<DoctorProfile> doctors,
        IReadOnlyList<Appointment> appointments,
        int adminUserId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var types = new[] { EncounterTypes.Outpatient, EncounterTypes.Emergency, EncounterTypes.FollowUp };
        var statuses = new[] { EncounterStatus.Open, EncounterStatus.Completed, EncounterStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var startedAt = now.AddDays(-(i % 180)).AddMinutes(i % 600);
                var status = statuses[i % statuses.Length];
                return new Encounter
                {
                    EncounterNumber = $"{SeedPrefix}-ENC-{i:D5}",
                    PatientProfileId = Pick(patients, i).Id,
                    DoctorProfileId = Pick(doctors, i).Id,
                    AppointmentId = i <= appointments.Count ? appointments[i - 1].Id : null,
                    EncounterType = types[i % types.Length],
                    StartedAt = startedAt,
                    EndedAt = status == EncounterStatus.Open ? null : startedAt.AddHours(2),
                    ClosedAt = status == EncounterStatus.Open ? null : startedAt.AddHours(2),
                    Status = status,
                    Notes = $"{SeedPrefix} encounter notes {i:D5}",
                    CreatedByUserId = adminUserId,
                    UpdatedByUserId = adminUserId,
                    CreatedAt = startedAt,
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.Encounters.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task AddDiagnosesAsync(int count, IReadOnlyList<Encounter> encounters, IReadOnlyList<DoctorProfile> doctors, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new Diagnosis
            {
                EncounterId = Pick(encounters, i).Id,
                CreatedByDoctorId = Pick(doctors, i).Id,
                IcdCode = $"Z{i % 99:D2}.{i % 10}",
                Description = $"{SeedPrefix} demo diagnosis description {i:D5}",
                Type = i % 2 == 0 ? "Primary" : "Secondary",
                Notes = $"{SeedPrefix} diagnosis notes {i:D5}",
                DiagnosedAt = now.AddDays(-(i % 180)),
                CreatedAt = now.AddDays(-(i % 180)),
                UpdatedAt = now
            })
            .ToList();

        _db.Diagnoses.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<Prescription>> AddPrescriptionsAsync(int count, IReadOnlyList<Encounter> encounters, IReadOnlyList<DoctorProfile> doctors, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = new[] { PrescriptionStatus.Active, PrescriptionStatus.Completed, PrescriptionStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i => new Prescription
            {
                EncounterId = Pick(encounters, i).Id,
                PrescribedByDoctorId = Pick(doctors, i).Id,
                Notes = $"{SeedPrefix} prescription notes {i:D5}",
                Status = statuses[i % statuses.Length],
                CreatedAt = now.AddDays(-(i % 180)),
                UpdatedAt = now
            })
            .ToList();

        _db.Prescriptions.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task AddPrescriptionItemsAsync(int count, IReadOnlyList<Prescription> prescriptions, IReadOnlyList<Medication> medications, DateTime now, CancellationToken cancellationToken)
    {
        var routes = new[] { "oral", "iv", "topical" };
        var items = Enumerable.Range(1, count)
            .Select(i => new PrescriptionItem
            {
                PrescriptionId = Pick(prescriptions, i).Id,
                MedicationId = Pick(medications, i).Id,
                Dosage = $"{1 + i % 4}",
                Unit = i % 2 == 0 ? "tablet" : "ml",
                Frequency = i % 3 == 0 ? "Twice daily" : "Once daily",
                Duration = $"{3 + i % 14} days",
                Route = routes[i % routes.Length],
                Instructions = $"{SeedPrefix} prescription item instructions {i:D5}",
                StartDate = now.Date.AddDays(-(i % 30)),
                EndDate = now.Date.AddDays(3 + i % 30),
                CreatedAt = now.AddDays(-(i % 90)),
                UpdatedAt = now
            })
            .ToList();

        _db.PrescriptionItems.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<LabRequest>> AddLabRequestsAsync(int count, IReadOnlyList<Encounter> encounters, IReadOnlyList<DoctorProfile> doctors, DateTime now, CancellationToken cancellationToken)
    {
        var priorities = new[] { LabRequestPriority.Routine, LabRequestPriority.Urgent, LabRequestPriority.Stat };
        var statuses = new[] { LabRequestStatus.Requested, LabRequestStatus.SampleCollected, LabRequestStatus.InProgress, LabRequestStatus.Completed, LabRequestStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var requestedAt = now.AddDays(-(i % 120));
                var status = statuses[i % statuses.Length];
                return new LabRequest
                {
                    RequestNumber = $"{SeedPrefix}-LR-{i:D5}",
                    EncounterId = Pick(encounters, i).Id,
                    RequestedByDoctorId = Pick(doctors, i).Id,
                    Priority = priorities[i % priorities.Length],
                    Status = status,
                    ClinicalNotes = $"{SeedPrefix} lab clinical notes {i:D5}",
                    RequestedAt = requestedAt,
                    CollectedAt = status != LabRequestStatus.Requested ? requestedAt.AddHours(2) : null,
                    CompletedAt = status == LabRequestStatus.Completed ? requestedAt.AddHours(8) : null,
                    CreatedAt = requestedAt,
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.LabRequests.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<LabRequestItem>> AddLabRequestItemsAsync(int count, IReadOnlyList<LabRequest> labRequests, IReadOnlyList<LabTest> labTests, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = new[] { LabRequestStatus.Requested, LabRequestStatus.SampleCollected, LabRequestStatus.InProgress, LabRequestStatus.Completed, LabRequestStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i => new LabRequestItem
            {
                LabRequestId = Pick(labRequests, i).Id,
                LabTestId = Pick(labTests, i).Id,
                Status = statuses[i % statuses.Length],
                Notes = $"{SeedPrefix} lab request item notes {i:D5}",
                CreatedAt = now.AddDays(-(i % 120)),
                UpdatedAt = now
            })
            .ToList();

        _db.LabRequestItems.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task AddLabResultsAsync(int count, IReadOnlyList<LabRequestItem> labRequestItems, IReadOnlyList<HmsFile> files, int adminUserId, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new LabResult
            {
                LabRequestItemId = Pick(labRequestItems, i).Id,
                ResultData = $"Value: {80 + i % 70}; generated for demo row {i:D5}.",
                ReferenceRange = "70-140",
                Interpretation = $"{SeedPrefix} interpretation {i:D5}",
                FileId = i % 4 == 0 ? Pick(files, i).Id : null,
                VerifiedByUserId = i % 3 == 0 ? adminUserId : null,
                VerifiedAt = i % 3 == 0 ? now.AddDays(-(i % 90)) : null,
                CreatedAt = now.AddDays(-(i % 90)),
                UpdatedAt = now
            })
            .ToList();

        _db.LabResults.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AddNurseTasksAsync(int count, IReadOnlyList<Encounter> encounters, IReadOnlyList<DoctorProfile> doctors, IReadOnlyList<NurseProfile> nurses, int adminUserId, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = new[] { NurseTaskStatus.Pending, NurseTaskStatus.InProgress, NurseTaskStatus.Completed, NurseTaskStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var status = statuses[i % statuses.Length];
                return new NurseTask
                {
                    EncounterId = Pick(encounters, i).Id,
                    AssignedByDoctorId = Pick(doctors, i).Id,
                    AssignedToNurseId = Pick(nurses, i).Id,
                    Type = TaskTypes[i % TaskTypes.Length],
                    Priority = i % 5 == 0 ? "urgent" : "routine",
                    Status = status,
                    Notes = $"{SeedPrefix} nurse task notes {i:D5}",
                    DueAt = now.AddDays((i % 30) - 15),
                    CompletedAt = status == NurseTaskStatus.Completed ? now.AddDays(-(i % 10)) : null,
                    CompletedByUserId = status == NurseTaskStatus.Completed ? adminUserId : null,
                    CreatedAt = now.AddDays(-(i % 60)),
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.NurseTasks.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<Bed>> AddBedsAsync(int count, IReadOnlyList<Department> departments, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new Bed
            {
                Ward = $"{SeedPrefix} {Wards[i % Wards.Length]}",
                RoomNumber = $"R{i / 4 + 1:D4}",
                BedNumber = $"B{i % 4 + 1:D2}",
                Floor = $"{1 + i % 8}",
                DepartmentId = Pick(departments, i).Id,
                IsActive = i % 37 != 0,
                Notes = $"{SeedPrefix} bed notes {i:D5}",
                CreatedAt = now.AddDays(-(i % 500)),
                UpdatedAt = now
            })
            .ToList();

        _db.Beds.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task<List<BedAssignment>> AddBedAssignmentsAsync(int count, IReadOnlyList<Bed> beds, IReadOnlyList<PatientProfile> patients, IReadOnlyList<Encounter> encounters, int adminUserId, DateTime now, CancellationToken cancellationToken)
    {
        var assignmentCount = Math.Min(count, Math.Min(beds.Count, patients.Count));
        var items = Enumerable.Range(1, assignmentCount)
            .Select(i =>
            {
                var assignedAt = now.AddDays(-(i % 120));
                var released = i % 3 != 0;
                return new BedAssignment
                {
                    BedId = beds[i - 1].Id,
                    PatientProfileId = patients[i - 1].Id,
                    EncounterId = Pick(encounters, i).Id,
                    AssignedAt = assignedAt,
                    AssignedByUserId = adminUserId,
                    ReleasedAt = released ? assignedAt.AddDays(1 + i % 8) : null,
                    ReleasedByUserId = released ? adminUserId : null,
                    Notes = $"{SeedPrefix} bed assignment notes {i:D5}",
                    ReleaseNotes = released ? $"{SeedPrefix} release notes {i:D5}" : null,
                    CreatedAt = assignedAt,
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.BedAssignments.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task AddBedAssignmentRequestsAsync(int count, IReadOnlyList<Encounter> encounters, IReadOnlyList<PatientProfile> patients, IReadOnlyList<DoctorProfile> doctors, IReadOnlyList<BedAssignment> bedAssignments, int adminUserId, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = new[] { BedAssignmentRequestStatus.Pending, BedAssignmentRequestStatus.Assigned, BedAssignmentRequestStatus.Rejected, BedAssignmentRequestStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var status = statuses[i % statuses.Length];
                return new BedAssignmentRequest
                {
                    EncounterId = Pick(encounters, i).Id,
                    PatientProfileId = Pick(patients, i).Id,
                    RequestedByDoctorId = Pick(doctors, i).Id,
                    Status = status,
                    Priority = i % 4 == 0 ? "urgent" : "routine",
                    Notes = $"{SeedPrefix} bed request notes {i:D5}",
                    PreferredWard = Wards[i % Wards.Length],
                    RequestedAt = now.AddDays(-(i % 80)),
                    ResolvedAt = status == BedAssignmentRequestStatus.Pending ? null : now.AddDays(-(i % 70)),
                    ResolvedByUserId = status == BedAssignmentRequestStatus.Pending ? null : adminUserId,
                    BedAssignmentId = status == BedAssignmentRequestStatus.Assigned ? Pick(bedAssignments, i).Id : null,
                    CreatedAt = now.AddDays(-(i % 80)),
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.BedAssignmentRequests.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<Invoice>> AddInvoicesAsync(int count, IReadOnlyList<PatientProfile> patients, IReadOnlyList<Encounter> encounters, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = new[] { InvoiceStatus.Draft, InvoiceStatus.Issued, InvoiceStatus.Paid, InvoiceStatus.PartiallyPaid, InvoiceStatus.Cancelled };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var subtotal = 60 + (i % 900);
                var tax = Math.Round(subtotal * 0.08m, 2);
                return new Invoice
                {
                    InvoiceNumber = $"{SeedPrefix}-INV-{i:D5}",
                    PatientProfileId = Pick(patients, i).Id,
                    EncounterId = Pick(encounters, i).Id,
                    Currency = "USD",
                    SubtotalAmount = subtotal,
                    DiscountAmount = i % 10 == 0 ? 10 : 0,
                    TaxAmount = tax,
                    TotalAmount = subtotal + tax - (i % 10 == 0 ? 10 : 0),
                    Status = statuses[i % statuses.Length],
                    IssuedAt = now.AddDays(-(i % 180)),
                    DueAt = now.AddDays(14 - (i % 60)),
                    CreatedAt = now.AddDays(-(i % 180)),
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.Invoices.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
        return items;
    }

    private async Task AddInvoiceItemsAsync(int count, IReadOnlyList<Invoice> invoices, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var quantity = 1 + i % 3;
                var unit = 35 + i % 300;
                return new InvoiceItem
                {
                    InvoiceId = Pick(invoices, i).Id,
                    Description = $"{SeedPrefix} invoice item {i:D5}",
                    Quantity = quantity,
                    UnitPrice = unit,
                    TotalPrice = quantity * unit,
                    SourceType = SeedPrefix,
                    SourceId = i,
                    CreatedAt = now.AddDays(-(i % 180)),
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.InvoiceItems.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AddPaymentsAsync(int count, IReadOnlyList<Invoice> invoices, int adminUserId, DateTime now, CancellationToken cancellationToken)
    {
        var statuses = new[] { PaymentStatus.Pending, PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Cancelled, PaymentStatus.Refunded };
        var items = Enumerable.Range(1, count)
            .Select(i =>
            {
                var status = statuses[i % statuses.Length];
                var invoice = Pick(invoices, i);
                return new Payment
                {
                    InvoiceId = invoice.Id,
                    Amount = invoice.TotalAmount,
                    PaymentMethod = PaymentMethods[i % PaymentMethods.Length],
                    Status = status,
                    PaidAt = status is PaymentStatus.Paid or PaymentStatus.Refunded ? now.AddDays(-(i % 90)) : null,
                    TransactionReference = $"{SeedPrefix}-PAY-{i:D5}",
                    ReceivedByUserId = status == PaymentStatus.Paid ? adminUserId : null,
                    StripeSessionId = i % 5 == 0 ? $"{SeedPrefix}-stripe-session-{i:D5}" : null,
                    StripePaymentIntentId = i % 5 == 0 ? $"{SeedPrefix}-stripe-intent-{i:D5}" : null,
                    CreatedAt = now.AddDays(-(i % 180)),
                    UpdatedAt = now
                };
            })
            .ToList();

        _db.Payments.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AddSettingsAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new Setting
            {
                Key = $"demo.setting.{i:D5}",
                Value = $"{SeedPrefix} value {i:D5}",
                Description = "Generated demo setting.",
                UpdatedAt = now
            })
            .ToList();

        _db.Settings.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AddAuditLogsAsync(int count, int adminUserId, DateTime now, CancellationToken cancellationToken)
    {
        var items = Enumerable.Range(1, count)
            .Select(i => new AuditLog
            {
                UserId = i % 4 == 0 ? adminUserId : null,
                Action = $"{SeedPrefix}.Action.{i:D5}",
                Entity = "DemoData",
                EntityId = i,
                OldValue = null,
                NewValue = $"{SeedPrefix} audit value {i:D5}",
                IpAddress = $"10.10.{i % 255}.{(i * 7) % 255}",
                CreatedAt = now.AddMinutes(-i),
                UpdatedAt = now
            })
            .ToList();

        _db.AuditLogs.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AddRefreshTokensAsync(int count, DateTime now, CancellationToken cancellationToken)
    {
        var users = await _db.Users
            .Where(user => user.UserName.StartsWith(SeedPrefix))
            .OrderBy(user => user.Id)
            .Take(count)
            .ToListAsync(cancellationToken);

        var items = users.Select((user, index) => new RefreshToken
            {
                UserId = user.Id,
                TokenHash = $"{SeedPrefix}-refresh-{index + 1:D5}",
                ExpiresAt = now.AddDays(30 + index % 60),
                RevokedAt = index % 7 == 0 ? now.AddDays(-(index % 20)) : null,
                CreatedAt = now.AddDays(-(index % 30)),
                UpdatedAt = now
            })
            .ToList();

        _db.RefreshTokens.AddRange(items);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private User NewUser(string suffix, DateTime now)
    {
        var user = new User
        {
            UserName = $"{SeedPrefix}-{suffix}",
            Email = $"{suffix}@demo.hms.local",
            IsActive = true,
            EmailVerifiedAt = now.AddDays(-10),
            LastLoginAt = now.AddDays(-_random.Next(0, 45)),
            CreatedAt = now.AddDays(-_random.Next(10, 900)),
            UpdatedAt = now
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, DemoPassword);
        return user;
    }

    private static Person NewPerson(User user, string suffix, int i, DateTime now) =>
        new()
        {
            User = user,
            FirstName = FirstNames[i % FirstNames.Length],
            LastName = LastNames[i % LastNames.Length],
            PersonalNumber = $"{SeedPrefix}-PN-{suffix}",
            DateOfBirth = now.Date.AddYears(-(18 + i % 70)).AddDays(i % 365),
            Gender = i % 2 == 0 ? "Female" : "Male",
            Phone = $"+38344{i % 1000:D3}{i % 10000:D4}",
            Address = $"{100 + i % 900} Demo Street",
            City = i % 2 == 0 ? "Pristina" : "Healthcare City",
            Country = "Kosovo",
            CreatedAt = now.AddDays(-(i % 900)),
            UpdatedAt = now
        };

    private static UserRole NewUserRole(User user, int roleId, DateTime now) =>
        new()
        {
            User = user,
            RoleId = roleId,
            AssignedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

    private static T Pick<T>(IReadOnlyList<T> items, int index)
    {
        if (items.Count == 0)
            throw new InvalidOperationException($"Cannot pick a demo {typeof(T).Name}; no records exist.");

        return items[(index - 1) % items.Count];
    }
}
