using HMS.Shared.Entities;

namespace Identity.Domain.Entities;

public enum AppointmentRequestStatus
{
    Pending,
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
    public string ReasonForVisit { get; set; } = string.Empty;
    public AppointmentRequestStatus Status { get; set; } = AppointmentRequestStatus.Pending;
}
