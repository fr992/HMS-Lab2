namespace HMS.Contracts.Identity
{
    public class AppointmentDto
    {
        public int Id { get; set; }

        // Patient
        public int PatientProfileId { get; set; }
        public string PatientName { get; set; } = string.Empty;

        // Doctor
        public int DoctorProfileId { get; set; }
        public string DoctorName { get; set; } = string.Empty;

        // Department
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        // Schedule
        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }

        // Status
        public string Status { get; set; } = string.Empty;

        // Details
        public string? AppointmentType { get; set; }
        public string? Reason { get; set; }
    }
}
