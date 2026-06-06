namespace HMS.Application.Abstractions.Identity;

public interface IAppointmentNotificationService
{
    Task<bool> NotifyAsync(AppointmentNotification notification, CancellationToken cancellationToken);
}

public sealed record AppointmentNotification(
    int AppointmentRequestId,
    string PatientName,
    string Email,
    string HospitalName,
    string Status,
    DateTime? ScheduledStart,
    string? DoctorName,
    string? DepartmentName,
    string? Reason);
