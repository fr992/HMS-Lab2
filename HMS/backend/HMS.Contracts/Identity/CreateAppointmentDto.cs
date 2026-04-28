namespace HMS.Contracts.Identity
{
    public class CreateAppointmentDto
    {
        // Participants
        public int PatientProfileId { get; set; }
        public int DoctorProfileId { get; set; }
        public int? DepartmentId { get; set; }

        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }

        public int ScheduledStatus { get; set; }
        public string? AppointmentType { get; set; }
        public string? Reason { get; set; }
    }
}
