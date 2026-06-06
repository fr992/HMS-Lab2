using HMS.Domain.Entities;
using HMS.Shared.Entities;

namespace Identity.Domain.Entities
{
    public class Appointment : BaseEntity
    {
        public int PatientProfileId { get; set; }
        public PatientProfile PatientProfile { get; set; } = null!;

        public int DoctorProfileId { get; set; }
        public DoctorProfile DoctorProfile { get; set; } = null!;

        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }

        public int? AppointmentRequestId { get; set; }
        public AppointmentRequest? AppointmentRequest { get; set; }
        public Encounter? Encounter { get; set; }

        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }

        public string Status { get; set; } = AppointmentStatus.Scheduled;
        public string? AppointmentType { get; set; }
        public string? Reason { get; set; }

        public string? CancellationReason { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? CheckedInAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        public int? CancelledByUserId { get; set; }
        public User? CancelledByUser { get; set; }
    }
}
