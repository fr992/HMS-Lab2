namespace HMS.Contracts.Identity
{
    public class AppointmentRequestDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public DateOnly PreferredDate { get; set; }
        public int? DoctorProfileId { get; set; }
        public string? DoctorName { get; set; }
        public string ReasonForVisit { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? AppointmentId { get; set; }
        public string? AppointmentStatus { get; set; }
        public int? EncounterId { get; set; }
        public DateTime? ScheduledStart { get; set; }
        public DateTime? ScheduledEnd { get; set; }
        public bool? EmailNotificationSent { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
