using HMS.Shared.Entities;
using HMS.Domain.Entities;

namespace Identity.Domain.Entities;

public enum AppointmentRequestStatus
{
    Pending,
    Rescheduled,
    Confirmed,
    Cancelled,
    Completed
}

public sealed class AppointmentRequest : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public DateOnly PreferredDate { get; set; }
    public DateTime? ProposedStart { get; set; }
    public int? DoctorProfileId { get; set; }
    public DoctorProfile? DoctorProfile { get; set; }
    public Appointment? Appointment { get; set; }
    public string ReasonForVisit { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public AppointmentRequestStatus Status { get; set; } = AppointmentRequestStatus.Pending;
}
