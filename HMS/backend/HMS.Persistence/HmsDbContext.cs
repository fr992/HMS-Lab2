using Microsoft.EntityFrameworkCore;
using Identity.Domain.Entities;
using HMS.Domain.Entities;

namespace HMS.Persistence; 

public class HmsDbContext : DbContext
{
    public HmsDbContext(DbContextOptions<HmsDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Person> People => Set<Person>();
    public DbSet<PatientProfile> PatientProfiles => Set<PatientProfile>();
    public DbSet<PatientContact> PatientContacts => Set<PatientContact>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentRequest> AppointmentRequests => Set<AppointmentRequest>();
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
    public DbSet<Encounter> Encounters => Set<Encounter>();
    public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
    public DbSet<Medication> Medications => Set<Medication>();
    public DbSet<LabRequest> LabRequests => Set<LabRequest>();
    public DbSet<LabRequestItem> LabRequestItems => Set<LabRequestItem>();
    public DbSet<LabResult> LabResults => Set<LabResult>();
    public DbSet<HmsFile> Files => Set<HmsFile>();
    public DbSet<LabTest> LabTests => Set<LabTest>();
    public DbSet<NurseProfile> NurseProfiles => Set<NurseProfile>();
    public DbSet<NurseTask> NurseTasks => Set<NurseTask>();
    public DbSet<Bed> Beds => Set<Bed>();
    public DbSet<BedAssignment> BedAssignments => Set<BedAssignment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HmsDbContext).Assembly);
    }
}
